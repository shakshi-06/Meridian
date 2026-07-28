#![no_std]

//! NodeRegistry
//!
//! Providers register VPN exit nodes against a stake of XLM. The registry
//! tracks each node's location, price, stake, active status, reputation and
//! lifetime earnings. Reputation and earnings are only mutable by the
//! trusted SessionManager contract, which is set once at deploy time and
//! locked by the admin. This is the "callee" side of the inter-contract
//! communication pair (SessionManager -> NodeRegistry).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN,
    Env, String, Vec,
};

const MIN_STAKE_STROOPS: i128 = 50_0000000; // 50 XLM minimum collateral

#[derive(Clone)]
#[contracttype]
pub struct Node {
    pub id: u64,
    pub owner: Address,
    pub country: String,
    pub endpoint_hash: BytesN<32>, // hash of the node's real address, never stored in plaintext
    pub price_per_hour: i128,      // stroops
    pub stake: i128,               // stroops currently locked
    pub active: bool,
    pub reputation_total: u32, // sum of all ratings received
    pub rating_count: u32,
    pub total_earned: i128,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    SessionManager,
    NodeCount,
    Node(u64),
    OwnerNodes(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum RegistryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    StakeTooLow = 3,
    NodeNotFound = 4,
    NotNodeOwner = 5,
    NodeNotActive = 6,
    NodeAlreadyActive = 7,
    Unauthorized = 8,
    SessionManagerAlreadySet = 9,
}

#[contract]
pub struct NodeRegistry;

#[contractimpl]
impl NodeRegistry {
    /// One-time setup. `token` is the XLM Stellar Asset Contract address on
    /// the target network, used to move stake in and out of escrow.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(RegistryError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NodeCount, &0u64);
        Ok(())
    }

    /// Admin-only, called once after SessionManager is deployed, so the
    /// registry knows which contract is trusted to write reputation and
    /// earnings updates.
    pub fn set_session_manager(env: Env, admin: Address, session_manager: Address) -> Result<(), RegistryError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(RegistryError::NotInitialized)?;
        if stored_admin != admin {
            return Err(RegistryError::Unauthorized);
        }
        if env.storage().instance().has(&DataKey::SessionManager) {
            return Err(RegistryError::SessionManagerAlreadySet);
        }
        env.storage()
            .instance()
            .set(&DataKey::SessionManager, &session_manager);
        Ok(())
    }

    /// Provider lists a node and locks `stake` XLM as collateral, held by
    /// this contract for as long as the node is active.
    pub fn register_node(
        env: Env,
        owner: Address,
        country: String,
        endpoint_hash: BytesN<32>,
        price_per_hour: i128,
        stake: i128,
    ) -> Result<u64, RegistryError> {
        owner.require_auth();
        if stake < MIN_STAKE_STROOPS {
            return Err(RegistryError::StakeTooLow);
        }

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(RegistryError::NotInitialized)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&owner, &env.current_contract_address(), &stake);

        let id: u64 = env.storage().instance().get(&DataKey::NodeCount).unwrap_or(0);
        let node = Node {
            id,
            owner: owner.clone(),
            country: country.clone(),
            endpoint_hash,
            price_per_hour,
            stake,
            active: true,
            reputation_total: 0,
            rating_count: 0,
            total_earned: 0,
        };
        env.storage().persistent().set(&DataKey::Node(id), &node);
        env.storage().instance().set(&DataKey::NodeCount, &(id + 1));

        let mut owned: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerNodes(owner.clone()))
            .unwrap_or(Vec::new(&env));
        owned.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerNodes(owner.clone()), &owned);

        env.events()
            .publish((symbol_short!("reg_node"), owner), (id, country, price_per_hour));
        Ok(id)
    }

    pub fn deactivate_node(env: Env, owner: Address, node_id: u64) -> Result<(), RegistryError> {
        owner.require_auth();
        let mut node = Self::require_node(&env, node_id)?;
        if node.owner != owner {
            return Err(RegistryError::NotNodeOwner);
        }
        if !node.active {
            return Err(RegistryError::NodeNotActive);
        }
        node.active = false;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
        env.events()
            .publish((symbol_short!("deactiv"), owner), node_id);
        Ok(())
    }

    pub fn reactivate_node(env: Env, owner: Address, node_id: u64) -> Result<(), RegistryError> {
        owner.require_auth();
        let mut node = Self::require_node(&env, node_id)?;
        if node.owner != owner {
            return Err(RegistryError::NotNodeOwner);
        }
        if node.active {
            return Err(RegistryError::NodeAlreadyActive);
        }
        node.active = true;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
        Ok(())
    }

    /// Withdraw stake for a node the owner has taken offline. Node must be
    /// inactive so a session in flight can never be left without collateral.
    pub fn withdraw_stake(env: Env, owner: Address, node_id: u64) -> Result<(), RegistryError> {
        owner.require_auth();
        let mut node = Self::require_node(&env, node_id)?;
        if node.owner != owner {
            return Err(RegistryError::NotNodeOwner);
        }
        if node.active {
            return Err(RegistryError::NodeNotActive);
        }
        let amount = node.stake;
        node.stake = 0;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &owner, &amount);
        Ok(())
    }

    /// Called only by SessionManager after a session ends, to record a
    /// user's 1-5 rating against the node's running reputation average.
    pub fn submit_rating(env: Env, caller: Address, node_id: u64, rating: u32) -> Result<(), RegistryError> {
        Self::require_session_manager(&env, &caller)?;
        let mut node = Self::require_node(&env, node_id)?;
        node.reputation_total += rating;
        node.rating_count += 1;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
        env.events()
            .publish((symbol_short!("rated"), node_id), rating);
        Ok(())
    }

    /// Called only by SessionManager once escrowed payment for a completed
    /// session has been released to the node owner.
    pub fn record_earning(env: Env, caller: Address, node_id: u64, amount: i128) -> Result<(), RegistryError> {
        Self::require_session_manager(&env, &caller)?;
        let mut node = Self::require_node(&env, node_id)?;
        node.total_earned += amount;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
        Ok(())
    }

    pub fn get_node(env: Env, node_id: u64) -> Result<Node, RegistryError> {
        Self::require_node(&env, node_id)
    }

    pub fn get_nodes_by_owner(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerNodes(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns every registered node id up to `limit`, for the frontend to
    /// filter/paginate client-side. Kept simple and bounded for demo scale.
    pub fn list_nodes(env: Env, limit: u32) -> Vec<Node> {
        let count: u64 = env.storage().instance().get(&DataKey::NodeCount).unwrap_or(0);
        let mut out = Vec::new(&env);
        let mut i: u64 = 0;
        while i < count && (out.len() as u32) < limit {
            if let Some(node) = env.storage().persistent().get(&DataKey::Node(i)) {
                out.push_back(node);
            }
            i += 1;
        }
        out
    }

    fn require_node(env: &Env, node_id: u64) -> Result<Node, RegistryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Node(node_id))
            .ok_or(RegistryError::NodeNotFound)
    }

    fn require_session_manager(env: &Env, caller: &Address) -> Result<(), RegistryError> {
        caller.require_auth();
        let sm: Address = env
            .storage()
            .instance()
            .get(&DataKey::SessionManager)
            .ok_or(RegistryError::NotInitialized)?;
        if &sm != caller {
            return Err(RegistryError::Unauthorized);
        }
        Ok(())
    }
}

mod test;
