/// DeepGrid — Automated liquidity vaults with token incentive flywheel on Sui.
/// This is the root module; individual modules are in separate files.
module deepgrid::version {
    /// Protocol version constant for upgrade compatibility.
    const VERSION: u64 = 1;

    public fun current(): u64 { VERSION }
}
