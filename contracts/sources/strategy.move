/// DeepGrid Strategy — Rebalance logic + settle fills.
///
/// StrategyConfig holds parameters for the narrow-range market-making strategy.
/// `rebalance()` cancels old orders and places new bid/ask around mid price.
/// `settle_fills()` processes filled orders and records yield in the vault.
module deepgrid::strategy {
    use sui::event;
    use deepgrid::vault::{Self, Vault};
    use deepgrid::mock_deepbook::{Self, OrderBook};

    // ======== Error codes ========
    const ENotKeeper: u64 = 300;

    // ======== Constants ========
    const BID: u8 = 0;
    const ASK: u8 = 1;
    const BPS_DENOM: u64 = 10_000;

    // ======== Objects ========

    /// Strategy configuration — owned by keeper/admin.
    public struct StrategyConfig has key, store {
        id: UID,
        /// Spread in basis points (e.g. 50 = 0.5% each side).
        spread_bps: u64,
        /// Size of each order in base units.
        order_size: u64,
        /// Number of orders on each side.
        num_orders: u64,
        /// Keeper address (authorized to call rebalance).
        keeper: address,
    }

    // ======== Events ========

    public struct Rebalanced has copy, drop {
        vault_id: ID,
        mid_price: u64,
        bid_price: u64,
        ask_price: u64,
        orders_placed: u64,
    }

    public struct Settled has copy, drop {
        vault_id: ID,
        base_returned: u64,
        quote_earned: u64,
    }

    // ======== Constructor ========

    /// Create a strategy config.
    public fun create_config(
        spread_bps: u64,
        order_size: u64,
        num_orders: u64,
        keeper: address,
        ctx: &mut TxContext,
    ): StrategyConfig {
        StrategyConfig {
            id: object::new(ctx),
            spread_bps,
            order_size,
            num_orders,
            keeper,
        }
    }

    /// Entry wrapper — creates config and transfers to sender.
    entry fun create_config_entry(
        spread_bps: u64,
        order_size: u64,
        num_orders: u64,
        keeper: address,
        ctx: &mut TxContext,
    ) {
        let config = create_config(spread_bps, order_size, num_orders, keeper, ctx);
        transfer::public_transfer(config, ctx.sender());
    }

    // ======== Rebalance ========

    /// Core rebalance: cancel old orders, place new bid/ask around mid price.
    /// Callable by keeper only.
    ///
    /// Flow:
    /// 1. Read mid price from orderbook (mock oracle).
    /// 2. Cancel all vault's existing orders.
    /// 3. Compute bid = mid * (1 - spread_bps/10000), ask = mid * (1 + spread_bps/10000).
    /// 4. Place `num_orders` bids and asks.
    /// 5. Lock vault assets for open orders.
    public fun rebalance<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        config: &StrategyConfig,
        book: &mut OrderBook,
        ctx: &TxContext,
    ) {
        assert!(ctx.sender() == config.keeper, ENotKeeper);

        let vault_id = vault::vault_id(vault);
        let mid = mock_deepbook::mid_price(book);

        // 1. Cancel existing orders and unlock assets.
        let (cancelled, _) = mock_deepbook::cancel_all(book, vault_id);
        if (cancelled > 0) {
            // Unlock previously locked assets (simplified: just reset locks).
            let locked_b = vault::locked_base(vault);
            let locked_q = vault::locked_quote(vault);
            if (locked_b > 0) { vault::unlock_base(vault, locked_b); };
            if (locked_q > 0) { vault::unlock_quote(vault, locked_q); };
        };

        // 2. Compute prices.
        let spread_amount = mid * config.spread_bps / BPS_DENOM;
        let bid_price = mid - spread_amount;
        let ask_price = mid + spread_amount;

        // 3. Place orders.
        let mut orders_placed = 0u64;
        let mut i = 0u64;
        let available_base = vault::base_balance_value(vault) - vault::locked_base(vault);
        let available_quote = vault::quote_balance_value(vault) - vault::locked_quote(vault);

        while (i < config.num_orders) {
            // Place bid (buy base with quote).
            let bid_cost = (config.order_size as u128) * (bid_price as u128) / 1_000_000_000;
            let bid_cost_u64 = (bid_cost as u64);
            if (bid_cost_u64 <= available_quote) {
                mock_deepbook::place_order(book, BID, bid_price, config.order_size, vault_id);
                vault::lock_quote(vault, bid_cost_u64);
                orders_placed = orders_placed + 1;
            };

            // Place ask (sell base for quote).
            if (config.order_size <= available_base) {
                mock_deepbook::place_order(book, ASK, ask_price, config.order_size, vault_id);
                vault::lock_base(vault, config.order_size);
                orders_placed = orders_placed + 1;
            };

            i = i + 1;
        };

        event::emit(Rebalanced {
            vault_id,
            mid_price: mid,
            bid_price,
            ask_price,
            orders_placed,
        });
    }

    /// Entry wrapper for rebalance.
    entry fun rebalance_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        config: &StrategyConfig,
        book: &mut OrderBook,
        ctx: &TxContext,
    ) {
        rebalance(vault, config, book, ctx);
    }

    // ======== Settle ========

    /// Settle filled orders: take pending fills from book, credit vault.
    /// Records spread yield as accrued fees (for the fee splitter).
    public fun settle_fills<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        book: &mut OrderBook,
    ) {
        let (base_returned, quote_earned) = mock_deepbook::take_pending_fills(book);

        // Unlock the base/quote that was locked for those filled orders.
        let locked_b = vault::locked_base(vault);
        let locked_q = vault::locked_quote(vault);
        // Simplified: assume all fills consumed all locks proportionally.
        if (base_returned > 0 && locked_b > 0) {
            let unlock_amt = if (base_returned > locked_b) { locked_b } else { base_returned };
            vault::unlock_base(vault, unlock_amt);
        };
        if (quote_earned > 0 && locked_q > 0) {
            let unlock_amt = if (quote_earned > locked_q) { locked_q } else { quote_earned };
            vault::unlock_quote(vault, unlock_amt);
        };

        // Record spread yield as fees.
        if (quote_earned > 0) {
            vault::add_fee_quote(vault, quote_earned);
        };

        event::emit(Settled {
            vault_id: vault::vault_id(vault),
            base_returned,
            quote_earned,
        });
    }

    /// Entry wrapper for settle.
    entry fun settle_fills_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        book: &mut OrderBook,
    ) {
        settle_fills(vault, book);
    }

    // ======== Accessors ========

    public fun spread_bps(config: &StrategyConfig): u64 { config.spread_bps }
    public fun order_size(config: &StrategyConfig): u64 { config.order_size }
    public fun num_orders(config: &StrategyConfig): u64 { config.num_orders }
    public fun keeper(config: &StrategyConfig): address { config.keeper }
}
