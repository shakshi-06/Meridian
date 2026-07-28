#![cfg(test)]

use super::*;
use node_registry::{NodeRegistry, NodeRegistryClient};
use soroban_sdk::{
    testutils::{Address as _, BytesN as _},
    BytesN, Env, String,
};

struct Harness {
    env: Env,
    token_address: Address,
    registry: NodeRegistryClient<'static>,
    sessions: SessionManagerClient<'static>,
    node_owner: Address,
    user: Address,
    node_id: u64,
}

fn setup(price_per_hour: i128) -> Harness {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let sac = token::StellarAssetClient::new(&env, &token_address);

    let registry_id = env.register(NodeRegistry, ());
    let registry = NodeRegistryClient::new(&env, &registry_id);
    registry.initialize(&admin, &token_address);

    let sessions_id = env.register(SessionManager, ());
    let sessions = SessionManagerClient::new(&env, &sessions_id);
    sessions.initialize(&admin, &registry_id, &token_address);

    registry.set_session_manager(&admin, &sessions_id);

    let node_owner = Address::generate(&env);
    sac.mint(&node_owner, &1000_0000000);
    let node_id = registry.register_node(
        &node_owner,
        &String::from_str(&env, "Netherlands"),
        &BytesN::<32>::random(&env),
        &price_per_hour,
        &50_0000000,
    );

    let user = Address::generate(&env);
    sac.mint(&user, &1000_0000000);

    Harness {
        env,
        token_address,
        registry,
        sessions,
        node_owner,
        user,
        node_id,
    }
}

#[test]
fn test_start_session_escrows_payment() {
    let h = setup(2_0000000);
    let session_id = h.sessions.start_session(&h.user, &h.node_id, &3u32);

    let session = h.sessions.get_session(&session_id);
    assert_eq!(session.amount, 6_0000000);
    assert_eq!(session.status, SessionStatus::Active);

    let token_client = token::Client::new(&h.env, &h.token_address);
    assert_eq!(token_client.balance(&h.user), 994_0000000);
}

#[test]
fn test_end_session_pays_owner_and_updates_registry() {
    let h = setup(1_0000000);
    let session_id = h.sessions.start_session(&h.user, &h.node_id, &5u32);
    h.sessions.end_session(&h.user, &session_id, &5u32);

    let session = h.sessions.get_session(&session_id);
    assert_eq!(session.status, SessionStatus::Completed);
    assert_eq!(session.rating, 5);

    let token_client = token::Client::new(&h.env, &h.token_address);
    assert_eq!(token_client.balance(&h.node_owner), 1005_0000000);

    let node = h.registry.get_node(&h.node_id);
    assert_eq!(node.rating_count, 1);
    assert_eq!(node.reputation_total, 5);
    assert_eq!(node.total_earned, 5_0000000);
}

#[test]
fn test_cannot_start_session_on_inactive_node() {
    let h = setup(1_0000000);
    h.registry.deactivate_node(&h.node_owner, &h.node_id);

    let result = h.sessions.try_start_session(&h.user, &h.node_id, &2u32);
    assert!(result.is_err());
}

#[test]
fn test_cannot_end_session_twice() {
    let h = setup(1_0000000);
    let session_id = h.sessions.start_session(&h.user, &h.node_id, &1u32);
    h.sessions.end_session(&h.user, &session_id, &4u32);

    let result = h.sessions.try_end_session(&h.user, &session_id, &4u32);
    assert!(result.is_err());
}

#[test]
fn test_rating_out_of_range_rejected() {
    let h = setup(1_0000000);
    let session_id = h.sessions.start_session(&h.user, &h.node_id, &1u32);

    let result = h.sessions.try_end_session(&h.user, &session_id, &9u32);
    assert!(result.is_err());
}

#[test]
fn test_zero_duration_rejected() {
    let h = setup(1_0000000);
    let result = h.sessions.try_start_session(&h.user, &h.node_id, &0u32);
    assert!(result.is_err());
}
