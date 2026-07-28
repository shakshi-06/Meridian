#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, BytesN as _},
    Env, String,
};

fn setup(env: &Env) -> (Address, Address, Address, NodeRegistryClient) {
    let admin = Address::generate(env);
    let token_admin = Address::generate(env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();

    let contract_id = env.register(NodeRegistry, ());
    let client = NodeRegistryClient::new(env, &contract_id);
    client.initialize(&admin, &token_address);

    (admin, token_address, contract_id, client)
}

fn mint(env: &Env, token_address: &Address, to: &Address, amount: i128) {
    let sac = token::StellarAssetClient::new(env, token_address);
    sac.mint(to, &amount);
}

#[test]
fn test_register_node_locks_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    let endpoint_hash = BytesN::<32>::random(&env);
    let node_id = client.register_node(
        &owner,
        &String::from_str(&env, "Netherlands"),
        &endpoint_hash,
        &1_0000000,
        &50_0000000,
    );

    let node = client.get_node(&node_id);
    assert_eq!(node.owner, owner);
    assert_eq!(node.stake, 50_0000000);
    assert!(node.active);

    let token_client = token::Client::new(&env, &token_address);
    assert_eq!(token_client.balance(&owner), 950_0000000);
}

#[test]
fn test_register_node_rejects_low_stake() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    let result = client.try_register_node(
        &owner,
        &String::from_str(&env, "Germany"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &1_0000000, // below MIN_STAKE_STROOPS
    );
    assert!(result.is_err());
}

#[test]
fn test_deactivate_and_withdraw_stake() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    let node_id = client.register_node(
        &owner,
        &String::from_str(&env, "Japan"),
        &BytesN::<32>::random(&env),
        &2_0000000,
        &60_0000000,
    );

    client.deactivate_node(&owner, &node_id);
    let node = client.get_node(&node_id);
    assert!(!node.active);

    client.withdraw_stake(&owner, &node_id);
    let token_client = token::Client::new(&env, &token_address);
    assert_eq!(token_client.balance(&owner), 1000_0000000);
}

#[test]
fn test_non_owner_cannot_deactivate() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    let stranger = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    let node_id = client.register_node(
        &owner,
        &String::from_str(&env, "Canada"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &50_0000000,
    );

    let result = client.try_deactivate_node(&stranger, &node_id);
    assert!(result.is_err());
}

#[test]
fn test_session_manager_can_submit_rating() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    let session_manager = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    client.set_session_manager(&admin, &session_manager);

    let node_id = client.register_node(
        &owner,
        &String::from_str(&env, "Singapore"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &50_0000000,
    );

    client.submit_rating(&session_manager, &node_id, &5u32);
    let node = client.get_node(&node_id);
    assert_eq!(node.rating_count, 1);
    assert_eq!(node.reputation_total, 5);
}

#[test]
fn test_untrusted_caller_cannot_submit_rating() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    let session_manager = Address::generate(&env);
    let impostor = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    client.set_session_manager(&admin, &session_manager);

    let node_id = client.register_node(
        &owner,
        &String::from_str(&env, "Brazil"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &50_0000000,
    );

    let result = client.try_submit_rating(&impostor, &node_id, &5u32);
    assert!(result.is_err());
}

#[test]
fn test_list_nodes_returns_registered_nodes() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, token_address, _contract_id, client) = setup(&env);
    let owner = Address::generate(&env);
    mint(&env, &token_address, &owner, 1000_0000000);

    client.register_node(
        &owner,
        &String::from_str(&env, "France"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &50_0000000,
    );
    client.register_node(
        &owner,
        &String::from_str(&env, "India"),
        &BytesN::<32>::random(&env),
        &1_0000000,
        &50_0000000,
    );

    let nodes = client.list_nodes(&10u32);
    assert_eq!(nodes.len(), 2);
}
