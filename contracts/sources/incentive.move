/// DeepGrid Incentive Engine — GRID emission and reward distribution.
///
/// Uses a "reward per share" accumulator pattern:
/// - On each rebalance/settle, `accrue_rewards()` mints GRID and increases reward_per_share.
/// - Each VaultShare tracks `reward_debt` = shares * reward_per_share at time of deposit/claim.
/// - Claimable = shares * current_rps - reward_debt.
///
/// This is the core of the incentive flywheel: LPs earn GRID for providing liquidity.
module deepgrid::incentive {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;
    use deepgrid::grid_token::{Self, GRID_TOKEN};
    use deepgrid::vault::{Self, Vault, VaultShare};

    // ======== Error codes ========
    const ENoRewards: u64 = 100;
    const EVaultMismatch: u64 = 101;

    // ======== Constants ========

    /// GRID emitted per rebalance call (MVP: fixed amount = 100 GRID with 9 decimals).
    const EMISSION_PER_REBALANCE: u64 = 100_000_000_000; // 100 GRID

    /// Precision scalar for reward_per_share (1e12).
    const PRECISION: u128 = 1_000_000_000_000;

    // ======== Events ========

    public struct RewardsAccrued has copy, drop {
        vault_id: ID,
        grid_minted: u64,
        new_reward_per_share: u128,
    }

    public struct RewardsClaimed has copy, drop {
        vault_id: ID,
        user: address,
        grid_amount: u64,
    }

    // ======== Core functions ========

    /// Accrue GRID rewards: mint emission and update reward_per_share.
    /// Called by the keeper on each rebalance.
    /// Minted GRID is stored in the vault's reward pool conceptually
    /// (actual GRID balance tracked externally or via vault field).
    public fun accrue_rewards<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        ctx: &mut TxContext,
    ) {
        let total = vault::total_shares(vault);
        if (total == 0) return;

        let emission = EMISSION_PER_REBALANCE;

        // Update reward_per_share accumulator.
        let current_rps = vault::reward_per_share(vault);
        let rps_increase = (emission as u128) * PRECISION / (total as u128);
        let new_rps = current_rps + rps_increase;

        vault::set_reward_per_share(vault, new_rps);

        // Mint GRID tokens and hold them (we'll transfer to vault's reward pool tracker).
        let grid_coin = grid_token::mint(treasury_cap, emission, ctx);
        // For MVP: we transfer minted GRID to a "reward pool" balance.
        // Since we can't store arbitrary coins in vault generically, we track the amount
        // and send GRID to the vault object address (self-custody pattern).
        vault::add_reward_pool(vault, emission);
        transfer::public_transfer(grid_coin, object::id_to_address(&vault::vault_id(vault)));

        event::emit(RewardsAccrued {
            vault_id: vault::vault_id(vault),
            grid_minted: emission,
            new_reward_per_share: new_rps,
        });
    }

    /// Calculate pending GRID rewards for a share position.
    public fun pending_rewards<Base, Quote>(
        vault: &Vault<Base, Quote>,
        share: &VaultShare<Base, Quote>,
    ): u64 {
        let shares = vault::share_amount(share);
        let current_rps = vault::reward_per_share(vault);
        let debt = vault::share_reward_debt(share);
        let pending = (shares as u128) * current_rps / PRECISION - debt;
        (pending as u64)
    }

    /// Claim accumulated GRID rewards.
    /// Mints the pending amount to the user and updates reward_debt.
    public fun claim_rewards<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        share: &mut VaultShare<Base, Quote>,
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        ctx: &mut TxContext,
    ): Coin<GRID_TOKEN> {
        assert!(vault::share_vault_id(share) == vault::vault_id(vault), EVaultMismatch);

        let shares = vault::share_amount(share);
        let current_rps = vault::reward_per_share(vault);
        let debt = vault::share_reward_debt(share);
        let pending = (shares as u128) * current_rps / PRECISION - debt;
        let pending_u64 = (pending as u64);

        assert!(pending_u64 > 0, ENoRewards);

        // Update reward debt to current level.
        let new_debt = (shares as u128) * current_rps / PRECISION;
        vault::set_share_reward_debt(share, new_debt);

        // Deduct from reward pool tracking.
        vault::deduct_reward_pool(vault, pending_u64);

        // Mint GRID for user.
        let reward_coin = grid_token::mint(treasury_cap, pending_u64, ctx);

        event::emit(RewardsClaimed {
            vault_id: vault::vault_id(vault),
            user: ctx.sender(),
            grid_amount: pending_u64,
        });

        reward_coin
    }

    /// Entry wrapper: claim and transfer to sender.
    entry fun claim_rewards_entry<Base, Quote>(
        vault: &mut Vault<Base, Quote>,
        share: &mut VaultShare<Base, Quote>,
        treasury_cap: &mut TreasuryCap<GRID_TOKEN>,
        ctx: &mut TxContext,
    ) {
        let coin = claim_rewards(vault, share, treasury_cap, ctx);
        transfer::public_transfer(coin, ctx.sender());
    }

    /// Get the emission rate (for UI display).
    public fun emission_per_rebalance(): u64 {
        EMISSION_PER_REBALANCE
    }
}
