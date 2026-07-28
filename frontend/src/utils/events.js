import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { RPC_URL, NODE_REGISTRY_CONTRACT_ID, SESSION_MANAGER_CONTRACT_ID } from './config';

const server = new rpc.Server(RPC_URL, { allowHttp: false });

// Soroban RPC only retains a rolling window of recent ledgers for
// getEvents, so each poll re-anchors to "latest minus N" rather than
// tracking a fixed start ledger.
const LEDGER_WINDOW = 4000; // roughly the last few hours on testnet

export async function fetchRecentEvents(limit = 25) {
  const latest = await server.getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - LEDGER_WINDOW);

  const res = await server.getEvents({
    startLedger,
    filters: [
      { type: 'contract', contractIds: [NODE_REGISTRY_CONTRACT_ID] },
      { type: 'contract', contractIds: [SESSION_MANAGER_CONTRACT_ID] },
    ],
    limit,
  });

  return (res.events ?? [])
    .map(decodeEvent)
    .filter(Boolean)
    .sort((a, b) => b.ledger - a.ledger)
    .slice(0, limit);
}

function decodeEvent(raw) {
  try {
    const topics = raw.topic.map((t) => scValToNative(t));
    const value = scValToNative(raw.value);
    const label = topics[0] ?? 'event';
    return {
      id: raw.id,
      ledger: raw.ledgerClosedAt ? raw.ledger : raw.ledger,
      closedAt: raw.ledgerClosedAt,
      contractId: raw.contractId,
      label: String(label),
      topics,
      value,
    };
  } catch {
    return null;
  }
}
