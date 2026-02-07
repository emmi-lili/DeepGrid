/// DeepGrid Vault — Shared object holding base/quote balances.
/// Users deposit coins and receive VaultShare objects representing their LP position.
/// Shares are proportional to deposited value (simplified: base_amt + quote_amt).
module deepgrid::vault {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;

    // ======== Error codes ========
    const EZeroDeposit: u64 = 0;
    const EVaultMismatch: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const EZeroShares: u64 = 3;

    // ======== Objects ========

    /// The main vault — a shared object. Parameterized by Base and Quote coin types.
    public struct Vault<phantom Base, phantom Quote> has key {
        id: UID,
        base_balance: Balance<Base>,
        quote_balance: Balance<Quote>,
        /// Total outstanding shares across all depositors.
        total_shares: u64,
        /// Base balance currently locked in open orders (tracked for withdraw calc).
        locked_base: u64,
        /// Quote balance currently locked in open orders.
        locked_quote: u64,
        /// Accumulated quote fees from spread (to be split by fee splitter).
        accrued_fee_quote: u64,
        /// Reward-per-share accumulator (scaled by 1e12). Set in COMMIT 3.
        reward_per_share: u128,
        /// Total GRID rewards available in pool.
        reward_pool_balance: u64,
    }

    /// Admin capability — whoever holds this can call privileged ops (e.g. config).
    public struct VaultAdminCap<phantom Base, phantom Quote> has key, store {
        id: UID,
        vault_id: ID,
    }

    /// LP share token — owned object representing a user's position.
    public struct VaultShare<phantom Base, phantom Quote> has key, store {
        id: UID,
        vault_id: ID,
        shares: u64,
        /// Reward debt for incentive accounting (scaled by 1e12).
        reward_debt: u128,
    }

    // ======== Events ========

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        creator: address,
    }

    public struct DepositEvent has copy, drop {
        vault_id: ID,
        depositor: address,
        base_amount: u64,
        quote_amount: u64,
        shares_minted: u64,
        total_shares_after: u64,
    }

    public struct WithdrawEvent has copy, drop {
        vault_id: ID,
        withdrawer: address,
        base_amount: u64,
        quote_amount: u64,
        shares_burned: u64,
        total_shares_after: u64,
    }

    // ======== Constructor ========

    /// Create a new vault and share it. Returns admin cap to caller.
    public fun create_vault<Base, Quote>(ctx: &mut TxContext): VaultAdminCap<Base, Quote> {
        let vault = Vault<Base, Quote> {
            id: object::new(ctx),
            base_balance: balance::zero<Base>(),
            quote_balance: balance::zero<Quote>(),
            total_shares: 0,
            locked_base: 0,
            locked_quote: 0,
            accrued_fee_quote: 0,
            reward_per_share: 0,
            reward_pool_balance: 0,
        };
        let vault_id = object::id(&vault);

        event::emit(VaultCreated {
            vault_id,
            creator: ctx.sender(),
        });

        transfer::share_object(vault);

        VaultAdminCap<Base, Quote> {
            id: object::new(ctx),
            vault_id,
        }
    }

    /// Entry wrapper: create vault and transfer admin cap to sender.
    entry fun create_vault_entry<Base, Quote>(ctx: &mut TxContext) {
        let cap = create_vault<Base, Quote>(ctx);
        transfer::public_transfer(cap, ctx.sender());
    }

    // ======== Deposit ========

    /// Deposit base and quote coins into the vault.
    /// Returns a VaultShare object representing the LP position.
    /// Share calculation (MVP): shares ∝ (base_amt + quote_amt) relative to total vault value.
    public fun deposit<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        base_coin: Coin<Base>,
        quote_coin: Coin<Quote>,
        ctx: &mut TxContext,
    ): VaultShare<Base, Quote> {
        let base_amount = base_coin.value();
        let quote_amount = quote_coin.value();
        assert!(base_amount > 0 || quote_amount > 0, EZeroDeposit);

        let deposit_value = (base_amount as u128) + (quote_amount as u128);

        let shares: u64 = if (vault.total_shares == 0) {
            // First deposit: shares = deposit value (1:1)
            (deposit_value as u64)
        } else {
            let total_base = vault.base_balance.value();
            let total_quote = vault.quote_balance.value();
            let total_value = (total_base as u128) + (total_quote as u128);
            // Pro-rata: new_shares = deposit_value * total_shares / total_value
            let s = deposit_value * (vault.total_shares as u128) / total_value;
            (s as u64)
        };

        assert!(shares > 0, EZeroShares);

        // Move coins into vault
        vault.base_balance.join(base_coin.into_balance());
        vault.quote_balance.join(quote_coin.into_balance());
        vault.total_shares = vault.total_shares + shares;

        // Reward debt = shares * reward_per_share (for incentive accounting)
        let reward_debt = (shares as u128) * vault.reward_per_share / 1_000_000_000_000;

        event::emit(DepositEvent {
            vault_id: object::id(vault),
            depositor: ctx.sender(),
            base_amount,
            quote_amount,
            shares_minted: shares,
            total_shares_after: vault.total_shares,
        });

        VaultShare<Base, Quote> {
            id: object::new(ctx),
            vault_id: object::id(vault),
            shares,
            reward_debt,
        }
    }

    /// Entry wrapper for deposit — sends VaultShare to caller.
    entry fun deposit_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        base_coin: Coin<Base>,
        quote_coin: Coin<Quote>,
        ctx: &mut TxContext,
    ) {
        let share = deposit(vault, base_coin, quote_coin, ctx);
        transfer::public_transfer(share, ctx.sender());
    }

    // ======== Withdraw ========

    /// Withdraw by burning a VaultShare. Returns proportional base and quote coins.
    /// Assets locked in open orders are excluded (user gets only available portion).
    public fun withdraw<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        share: VaultShare<Base, Quote>,
        ctx: &mut TxContext,
    ): (Coin<Base>, Coin<Quote>) {
        let VaultShare { id, vault_id, shares, reward_debt: _ } = share;
        assert!(vault_id == object::id(vault), EVaultMismatch);
        assert!(shares > 0, EZeroShares);

        // Available = total - locked
        let available_base = vault.base_balance.value() - vault.locked_base;
        let available_quote = vault.quote_balance.value() - vault.locked_quote;

        // Pro-rata on available balances
        let base_out = ((available_base as u128) * (shares as u128) / (vault.total_shares as u128) as u64);
        let quote_out = ((available_quote as u128) * (shares as u128) / (vault.total_shares as u128) as u64);

        assert!(base_out <= available_base && quote_out <= available_quote, EInsufficientBalance);

        vault.total_shares = vault.total_shares - shares;

        let base_coin = coin::from_balance(vault.base_balance.split(base_out), ctx);
        let quote_coin = coin::from_balance(vault.quote_balance.split(quote_out), ctx);

        event::emit(WithdrawEvent {
            vault_id: object::id(vault),
            withdrawer: ctx.sender(),
            base_amount: base_out,
            quote_amount: quote_out,
            shares_burned: shares,
            total_shares_after: vault.total_shares,
        });

        object::delete(id);

        (base_coin, quote_coin)
    }

    /// Entry wrapper for withdraw — sends coins to caller.
    entry fun withdraw_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        share: VaultShare<Base, Quote>,
        ctx: &mut TxContext,
    ) {
        let (base_coin, quote_coin) = withdraw(vault, share, ctx);
        transfer::public_transfer(base_coin, ctx.sender());
        transfer::public_transfer(quote_coin, ctx.sender());
    }

    // ======== Accessors (public for scripts/other modules) ========

    public fun base_balance_value<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.base_balance.value()
    }

    public fun quote_balance_value<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.quote_balance.value()
    }

    public fun total_shares<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.total_shares
    }

    public fun locked_base<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.locked_base
    }

    public fun locked_quote<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.locked_quote
    }

    public fun accrued_fee_quote<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.accrued_fee_quote
    }

    public fun vault_id<Base, Quote>(vault: &Vault<Base, Quote>): ID {
        object::id(vault)
    }

    public fun share_vault_id<Base, Quote>(share: &VaultShare<Base, Quote>): ID {
        share.vault_id
    }

    public fun share_amount<Base, Quote>(share: &VaultShare<Base, Quote>): u64 {
        share.shares
    }

    public fun reward_per_share<Base, Quote>(vault: &Vault<Base, Quote>): u128 {
        vault.reward_per_share
    }

    public fun share_reward_debt<Base, Quote>(share: &VaultShare<Base, Quote>): u128 {
        share.reward_debt
    }

    // ======== Friend-only mutators (for strategy/incentive modules) ========

    /// Lock base balance for open orders.
    public(package) fun lock_base<Base, Quote>(vault: &mut Vault<Base, Quote>, amount: u64) {
        vault.locked_base = vault.locked_base + amount;
    }

    /// Unlock base balance when orders are cancelled/settled.
    public(package) fun unlock_base<Base, Quote>(vault: &mut Vault<Base, Quote>, amount: u64) {
        vault.locked_base = vault.locked_base - amount;
    }

    /// Lock quote balance for open orders.
    public(package) fun lock_quote<Base, Quote>(vault: &mut Vault<Base, Quote>, amount: u64) {
        vault.locked_quote = vault.locked_quote + amount;
    }

    /// Unlock quote balance when orders are cancelled/settled.
    public(package) fun unlock_quote<Base, Quote>(vault: &mut Vault<Base, Quote>, amount: u64) {
        vault.locked_quote = vault.locked_quote - amount;
    }

    /// Add realized fee (quote) from filled orders.
    public(package) fun add_fee_quote<Base, Quote>(vault: &mut Vault<Base, Quote>, amount: u64) {
        vault.accrued_fee_quote = vault.accrued_fee_quote + amount;
    }

    /// Withdraw accrued fees (used by fee splitter).
    public(package) fun take_fees<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<Quote> {
        assert!(amount <= vault.accrued_fee_quote, EInsufficientBalance);
        vault.accrued_fee_quote = vault.accrued_fee_quote - amount;
        coin::from_balance(vault.quote_balance.split(amount), ctx)
    }

    /// Add quote balance back to vault (e.g. LP portion of fees).
    public(package) fun return_quote<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        coin: Coin<Quote>,
    ) {
        vault.quote_balance.join(coin.into_balance());
    }

    /// Update reward_per_share accumulator (called by incentive module).
    public(package) fun set_reward_per_share<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        new_rps: u128,
    ) {
        vault.reward_per_share = new_rps;
    }

    /// Update reward debt on a share (called by incentive module on claim).
    public(package) fun set_share_reward_debt<Base, Quote>(
        share: &mut VaultShare<Base, Quote>,
        debt: u128,
    ) {
        share.reward_debt = debt;
    }

    /// Add base balance (e.g. returned from filled buy order).
    public(package) fun return_base<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        coin: Coin<Base>,
    ) {
        vault.base_balance.join(coin.into_balance());
    }

    /// Get mutable reference to quote balance for operations.
    public(package) fun borrow_quote_balance_mut<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
    ): &mut Balance<Quote> {
        &mut vault.quote_balance
    }

    /// Get mutable reference to base balance for operations.
    public(package) fun borrow_base_balance_mut<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
    ): &mut Balance<Base> {
        &mut vault.base_balance
    }

    /// Increment reward pool balance.
    public(package) fun add_reward_pool<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        amount: u64,
    ) {
        vault.reward_pool_balance = vault.reward_pool_balance + amount;
    }

    /// Read reward pool balance.
    public fun reward_pool_balance<Base, Quote>(vault: &Vault<Base, Quote>): u64 {
        vault.reward_pool_balance
    }

    /// Decrement reward pool balance (on claim).
    public(package) fun deduct_reward_pool<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        amount: u64,
    ) {
        vault.reward_pool_balance = vault.reward_pool_balance - amount;
    }
}
