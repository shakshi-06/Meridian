#![no_std]

//! SessionManager
//!
//! Users rent a node for a fixed number of hours. Payment is escrowed by
//! this contract at session start and released to the node's owner at
//! session end, at which point a 1-5 rating and the earned amount are
//! pushed back into NodeRegistry. This is the "caller" side of the
//! inter-contract communication pair: every `start_session` and
//! `end_session` call reaches across into NodeRegistry to read node state
//! and write reputation/earnings.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

mod node_registry_contract {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/node_registry.wasm");
}
use node_registry_contract::Client as NodeRegistryClient;

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum SessionStatus {
    Active,
    Completed,
}

#[derive(Clone)]
#[contracttype]
pub struct Session {
    pub id: u64,
    pub user: Address,
    pub node_id: u64,
    pub node_owner: Address,
    pub start_time: u64,
    pub duration_hours: u32,
    pub amount: i128,
    pub status: SessionStatus,
    pub rating: u32, // 0 until end_session is called
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Registry,
    SessionCount,
    Session(u64),
    UserSessions(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum SessionError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NodeNotActive = 3,
    InvalidDuration = 4,
    SessionNotFound = 5,
    NotSessionOwner = 6,
    SessionNotActive = 7,
    InvalidRating = 8,
}

const MAX_SESSION_HOURS: u32 = 24 * 30; // 30 days ceiling per rental

#[contract]
pub struct SessionManager;

#[contractimpl]
impl SessionManager {
    pub fn initialize(env: Env, admin: Address, registry: Address, token: Address) -> Result<(), SessionError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(SessionError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::SessionCount, &0u64);
        Ok(())
    }

    /// Rents `node_id` for `duration_hours`. Reads the node's live price and
    /// active flag straight from NodeRegistry, then escrows
    /// price_per_hour * duration_hours from the user into this contract.
    pub fn start_session(
        env: Env,
        user: Address,
        node_id: u64,
        duration_hours: u32,
    ) -> Result<u64, SessionError> {
        user.require_auth();
        if duration_hours == 0 || duration_hours > MAX_SESSION_HOURS {
            return Err(SessionError::InvalidDuration);
        }

        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .ok_or(SessionError::NotInitialized)?;
        let registry = NodeRegistryClient::new(&env, &registry_addr);
        let node = registry.get_node(&node_id);
        if !node.active {
            return Err(SessionError::NodeNotActive);
        }

        let amount = node.price_per_hour * (duration_hours as i128);

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::SessionCount)
            .unwrap_or(0);
        let session = Session {
            id,
            user: user.clone(),
            node_id,
            node_owner: node.owner.clone(),
            start_time: env.ledger().timestamp(),
            duration_hours,
            amount,
            status: SessionStatus::Active,
            rating: 0,
        };
        env.storage().persistent().set(&DataKey::Session(id), &session);
        env.storage()
            .instance()
            .set(&DataKey::SessionCount, &(id + 1));

        let mut mine: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserSessions(user.clone()))
            .unwrap_or(Vec::new(&env));
        mine.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::UserSessions(user.clone()), &mine);

        env.events()
            .publish((symbol_short!("start"), user), (id, node_id, amount));
        Ok(id)
    }

    /// Ends an active session: releases escrowed payment to the node
    /// owner, then calls back into NodeRegistry to record the rating and
    /// the earning against that node.
    pub fn end_session(
        env: Env,
        user: Address,
        session_id: u64,
        rating: u32,
    ) -> Result<(), SessionError> {
        user.require_auth();
        if rating < 1 || rating > 5 {
            return Err(SessionError::InvalidRating);
        }

        let mut session: Session = env
            .storage()
            .persistent()
            .get(&DataKey::Session(session_id))
            .ok_or(SessionError::SessionNotFound)?;
        if session.user != user {
            return Err(SessionError::NotSessionOwner);
        }
        if session.status != SessionStatus::Active {
            return Err(SessionError::SessionNotActive);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(
            &env.current_contract_address(),
            &session.node_owner,
            &session.amount,
        );

        session.status = SessionStatus::Completed;
        session.rating = rating;
        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry = NodeRegistryClient::new(&env, &registry_addr);
        registry.submit_rating(&env.current_contract_address(), &session.node_id, &rating);
        registry.record_earning(
            &env.current_contract_address(),
            &session.node_id,
            &session.amount,
        );

        env.events()
            .publish((symbol_short!("end"), user), (session_id, rating));
        Ok(())
    }

    pub fn get_session(env: Env, session_id: u64) -> Result<Session, SessionError> {
        env.storage()
            .persistent()
            .get(&DataKey::Session(session_id))
            .ok_or(SessionError::SessionNotFound)
    }

    pub fn get_sessions_by_user(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserSessions(user))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;
