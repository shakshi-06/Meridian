import { readContract, invokeContract, scv } from './soroban';
import { NODE_REGISTRY_CONTRACT_ID, SESSION_MANAGER_CONTRACT_ID } from './config';

const addr = (a) => scv(a, 'address');
const u32 = (n) => scv(n, 'u32');
const u64 = (n) => scv(n, 'u64');
const i128 = (n) => scv(n, 'i128');
const str = (s) => scv(s, 'string');
const bytes32 = (u8) => scv(u8, 'bytes');

export async function hashEndpoint(plaintext) {
  const enc = new TextEncoder().encode(plaintext);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return new Uint8Array(digest);
}

function toXlm(stroops) {
  return Number(stroops) / 10_000_000;
}

function fromXlm(xlm) {
  return BigInt(Math.round(Number(xlm) * 10_000_000));
}

function normalizeNode(raw) {
  if (!raw) return null;
  const ratingCount = Number(raw.rating_count ?? 0);
  const reputationTotal = Number(raw.reputation_total ?? 0);
  return {
    id: Number(raw.id),
    owner: raw.owner,
    country: raw.country,
    pricePerHourXlm: toXlm(raw.price_per_hour),
    stakeXlm: toXlm(raw.stake),
    active: raw.active,
    ratingCount,
    avgRating: ratingCount > 0 ? reputationTotal / ratingCount : null,
    totalEarnedXlm: toXlm(raw.total_earned),
  };
}

function normalizeSession(raw) {
  if (!raw) return null;
  return {
    id: Number(raw.id),
    user: raw.user,
    nodeId: Number(raw.node_id),
    nodeOwner: raw.node_owner,
    startTime: Number(raw.start_time),
    durationHours: Number(raw.duration_hours),
    amountXlm: toXlm(raw.amount),
    status: raw.status?.tag ?? raw.status,
    rating: Number(raw.rating ?? 0),
  };
}

// ---------- NodeRegistry ----------

export async function listNodes(limit = 50) {
  const raw = await readContract(NODE_REGISTRY_CONTRACT_ID, 'list_nodes', [u32(limit)]);
  return (raw ?? []).map(normalizeNode);
}

export async function getNode(nodeId) {
  const raw = await readContract(NODE_REGISTRY_CONTRACT_ID, 'get_node', [u64(nodeId)]);
  return normalizeNode(raw);
}

export async function getNodesByOwner(owner) {
  const raw = await readContract(NODE_REGISTRY_CONTRACT_ID, 'get_nodes_by_owner', [addr(owner)]);
  return (raw ?? []).map(Number);
}

export async function registerNode(wallet, { country, endpointPlaintext, priceXlm, stakeXlm }) {
  const endpointHash = await hashEndpoint(endpointPlaintext);
  return invokeContract(
    NODE_REGISTRY_CONTRACT_ID,
    'register_node',
    [addr(wallet), str(country), bytes32(endpointHash), i128(fromXlm(priceXlm)), i128(fromXlm(stakeXlm))],
    wallet
  );
}

export async function deactivateNode(wallet, nodeId) {
  return invokeContract(NODE_REGISTRY_CONTRACT_ID, 'deactivate_node', [addr(wallet), u64(nodeId)], wallet);
}

export async function reactivateNode(wallet, nodeId) {
  return invokeContract(NODE_REGISTRY_CONTRACT_ID, 'reactivate_node', [addr(wallet), u64(nodeId)], wallet);
}

export async function withdrawStake(wallet, nodeId) {
  return invokeContract(NODE_REGISTRY_CONTRACT_ID, 'withdraw_stake', [addr(wallet), u64(nodeId)], wallet);
}

// ---------- SessionManager ----------

export async function startSession(wallet, nodeId, durationHours) {
  return invokeContract(
    SESSION_MANAGER_CONTRACT_ID,
    'start_session',
    [addr(wallet), u64(nodeId), u32(durationHours)],
    wallet
  );
}

export async function endSession(wallet, sessionId, rating) {
  return invokeContract(
    SESSION_MANAGER_CONTRACT_ID,
    'end_session',
    [addr(wallet), u64(sessionId), u32(rating)],
    wallet
  );
}

export async function getSession(sessionId) {
  const raw = await readContract(SESSION_MANAGER_CONTRACT_ID, 'get_session', [u64(sessionId)]);
  return normalizeSession(raw);
}

export async function getSessionsByUser(user) {
  const raw = await readContract(SESSION_MANAGER_CONTRACT_ID, 'get_sessions_by_user', [addr(user)]);
  return (raw ?? []).map(Number);
}
