/// DeepGrid Buyback — Fee splitting, token market, and buyback-and-burn.
///
/// Flow:
/// 1. Fee splitter takes accrued quote fees from vault.
/// 2. Splits: LP_SHARE% back to vault, BUYBACK_SHARE% to buyback.
/// 3. Buyback buys GRID from TokenMarket (fixed-price MVP).
/// 4. Bought GRID: 50% burned, 50% sent to vault reward pool.
///
/// TokenMarket is a simple fixed-price GRID/QUOTE market:
/// - Holds a GRID reserve, sells at a fixed price.
/// - For MVP, acts as a constant-price market maker.
module deepgrid::buyback {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::event;
    use deepgrid::grid_token::{Self, GRID_TOKEN};
    use deepgrid::vault::{Self, Vault};

    // ======== Error codes ========
    const EInsufficientReserve: u64 = 400;
    const ENoFees: u64 = 401;
    const EZeroAmount: u64 = 402;

    // ======== Constants ========
    /// Fee split: 60% to LPs, 40% to buyback (in basis points).
    const LP_SHARE_BPS: u64 = 6_000;
    const BUYBACK_SHARE_BPS: u64 = 4_000;
    const BPS_DENOM: u64 = 10_000;

    /// Of bought GRID: 50% burn, 50% to reward pool.
    const BURN_SHARE_BPS: u64 = 5_000;

    // ======== Objects ========

    /// Fixed-price token market: sells GRID for quote at a set price.
    /// Price is expressed as quote_per_grid (scaled 1e9).
    /// For MVP: initialized with a GRID reserve minted from treasury.
    public struct TokenMarket<phantom Quote> has key {
        id: UID,
        grid_reserve: Balance<GRID_TOKEN>,
        quote_reserve: Balance<Quote>,
        /// Price: how much quote per 1 GRID (1e9 base unit). e.g. 1_000_000 = 0.001 QUOTE/GRID
        price_quote_per_grid: u64,
    }

    // ======== Events ========

    public struct FeeSplit has copy, drop {
        vault_id: ID,
        total_fees: u64,
        lp_portion: u64,
        buyback_portion: u64,
    }

    public struct BuybackExecuted has copy, drop {
        quote_spent: u64,
        grid_bought: u64,
        grid_burned: u64,
        grid_to_rewards: u64,
    }

    public struct TokenMarketCreated has copy, drop {
        market_id: ID,
        initial_grid_reserve: u64,
        price_quote_per_grid: u64,
    }

    // ======== TokenMarket ========

    /// Create a fixed-price token market.
    /// Seed it with GRID from treasury cap.
    public fun create_token_market<Quote>(
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        initial_grid_amount: u64,
        price_quote_per_grid: u64,
        ctx: &mut TxContext,
    ): ID {
        let grid_coin = grid_token::mint(treasury_cap, initial_grid_amount, ctx);
        let market = TokenMarket<Quote> {
            id: object::new(ctx),
            grid_reserve: grid_coin.into_balance(),
            quote_reserve: balance::zero<Quote>(),
            price_quote_per_grid,
        };
        let market_id = object::id(&market);

        event::emit(TokenMarketCreated {
            market_id,
            initial_grid_reserve: initial_grid_amount,
            price_quote_per_grid,
        });

        transfer::share_object(market);
        market_id
    }

    /// Buy GRID with quote coins from the market (fixed price).
    /// Returns the GRID purchased.
    public fun buy_grid<Quote>(
        market: &mut TokenMarket<Quote>,
        quote_coin: Coin<Quote>,
        ctx: &mut TxContext,
    ): Coin<GRID_TOKEN> {
        let quote_amount = quote_coin.value();
        assert!(quote_amount > 0, EZeroAmount);

        // grid_amount = quote_amount * 1e9 / price_quote_per_grid
        let grid_amount = (quote_amount as u128) * 1_000_000_000 / (market.price_quote_per_grid as u128);
        let grid_amount_u64 = (grid_amount as u64);

        assert!(grid_amount_u64 <= market.grid_reserve.value(), EInsufficientReserve);

        // Take GRID from reserve, deposit quote.
        market.quote_reserve.join(quote_coin.into_balance());
        let grid_balance = market.grid_reserve.split(grid_amount_u64);
        coin::from_balance(grid_balance, ctx)
    }

    // ======== Fee Split + Buyback ========

    /// Execute the full fee-split and buyback cycle.
    ///
    /// 1. Take all accrued fees from vault.
    /// 2. LP_SHARE% → back to vault quote balance.
    /// 3. BUYBACK_SHARE% → buy GRID from market → burn 50%, reward pool 50%.
    public fun execute_buyback<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        market: &mut TokenMarket<Quote>,
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        ctx: &mut TxContext,
    ) {
        let total_fees = vault::accrued_fee_quote(vault);
        assert!(total_fees > 0, ENoFees);

        // Split fees.
        let lp_portion = total_fees * LP_SHARE_BPS / BPS_DENOM;
        let buyback_portion = total_fees - lp_portion;

        // Take fee coins from vault.
        let fee_coin = vault::take_fees(vault, total_fees, ctx);
        let mut fee_balance = fee_coin.into_balance();

        // LP portion → return to vault.
        let lp_balance = fee_balance.split(lp_portion);
        vault::return_quote(vault, coin::from_balance(lp_balance, ctx));

        event::emit(FeeSplit {
            vault_id: vault::vault_id(vault),
            total_fees,
            lp_portion,
            buyback_portion,
        });

        // Buyback portion → buy GRID.
        let buyback_coin = coin::from_balance(fee_balance, ctx);
        let grid_coin = buy_grid(market, buyback_coin, ctx);
        let grid_bought = grid_coin.value();

        // Split GRID: 50% burn, 50% rewards.
        let mut grid_balance = grid_coin.into_balance();
        let burn_amount = grid_bought * BURN_SHARE_BPS / BPS_DENOM;
        let reward_amount = grid_bought - burn_amount;

        // Burn.
        let burn_coin = coin::from_balance(grid_balance.split(burn_amount), ctx);
        grid_token::burn(treasury_cap, burn_coin);

        // Rewards → transfer to vault reward pool address.
        let reward_coin = coin::from_balance(grid_balance, ctx);
        vault::add_reward_pool(vault, reward_amount);
        transfer::public_transfer(reward_coin, object::id_to_address(&vault::vault_id(vault)));

        event::emit(BuybackExecuted {
            quote_spent: buyback_portion,
            grid_bought,
            grid_burned: burn_amount,
            grid_to_rewards: reward_amount,
        });
    }

    /// Entry wrapper.
    entry fun execute_buyback_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        market: &mut TokenMarket<Quote>,
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        ctx: &mut TxContext,
    ) {
        execute_buyback(vault, market, treasury_cap, ctx);
    }

    // ======== Accessors ========

    public fun grid_reserve<Quote>(market: &TokenMarket<Quote>): u64 {
        market.grid_reserve.value()
    }

    public fun quote_reserve<Quote>(market: &TokenMarket<Quote>): u64 {
        market.quote_reserve.value()
    }

    public fun price<Quote>(market: &TokenMarket<Quote>): u64 {
        market.price_quote_per_grid
    }

    public fun lp_share_bps(): u64 { LP_SHARE_BPS }
    public fun buyback_share_bps(): u64 { BUYBACK_SHARE_BPS }
}
