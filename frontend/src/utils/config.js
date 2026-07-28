// Fill these in after running the deployment steps in DEPLOYMENT.md.
// Placeholder values are intentionally invalid so a misconfigured build fails
// loudly instead of silently pointing at nothing.

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export const NODE_REGISTRY_CONTRACT_ID =
  import.meta.env.VITE_NODE_REGISTRY_CONTRACT_ID || 'REPLACE_WITH_NODE_REGISTRY_CONTRACT_ID';

export const SESSION_MANAGER_CONTRACT_ID =
  import.meta.env.VITE_SESSION_MANAGER_CONTRACT_ID || 'REPLACE_WITH_SESSION_MANAGER_CONTRACT_ID';

export const XLM_SAC_CONTRACT_ID =
  import.meta.env.VITE_XLM_SAC_CONTRACT_ID ||
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // native XLM SAC on testnet

export function isConfigured() {
  return (
    !NODE_REGISTRY_CONTRACT_ID.startsWith('REPLACE_') &&
    !SESSION_MANAGER_CONTRACT_ID.startsWith('REPLACE_')
  );
}
