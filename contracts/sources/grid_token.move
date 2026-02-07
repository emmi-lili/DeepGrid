/// GRID token — the incentive token for DeepGrid protocol.
/// Standard Sui Coin with OTW (One-Time Witness) pattern.
/// TreasuryCap is held by the protocol for emission/minting.
module deepgrid::grid_token {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::url;

    /// One-Time Witness for the GRID coin type.
    public struct GRID_TOKEN has drop {}

    /// Initialize the GRID coin type. Called once on package publish.
    fun init(witness: GRID_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, // 9 decimals like SUI
            b"GRID",
            b"DeepGrid",
            b"Incentive token for DeepGrid automated liquidity vaults on Sui",
            option::some(url::new_unsafe_from_bytes(
                b"https://deepgrid.io/grid-icon.png"
            )),
            ctx,
        );

        // Freeze metadata so it can't be changed.
        transfer::public_freeze_object(metadata);
        // Transfer treasury cap to deployer (will be passed to incentive module).
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    /// Mint GRID tokens (called by incentive engine holding TreasuryCap).
    public fun mint(
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<GRID_TOKEN> {
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Burn GRID tokens (used in buyback-and-burn).
    public fun burn(
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        coin: Coin<GRID_TOKEN>,
    ): u64 {
        coin::burn(treasury_cap, coin)
    }

    /// Get the total supply of GRID.
    public fun total_supply(treasury_cap: &TreasuryCap<GRID_TOKEN>): u64 {
        coin::total_supply(treasury_cap)
    }
}
