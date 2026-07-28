import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Account,
  nativeToScVal,
  scValToNative,
  rpc,
} from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, RPC_URL } from './config';
import { signXdr } from './freighter';

const server = new rpc.Server(RPC_URL, { allowHttp: false });

// Used only to satisfy the transaction builder's "source account" field for
// simulation-only reads. It is never submitted, so it does not need to be a
// real or funded account.
const READ_ONLY_SOURCE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

export class ContractCallError extends Error {}

function toScVal(arg) {
  if (arg && arg.__scval) return arg.value;
  return nativeToScVal(arg.value, arg.type ? { type: arg.type } : undefined);
}

function buildTx(sourceAccount, contractId, method, scArgs) {
  const contract = new Contract(contractId);
  return new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...scArgs))
    .setTimeout(60)
    .build();
}

/**
 * Read-only contract call. Simulates but never submits, so it needs no
 * wallet connection and costs no fee.
 */
export async function readContract(contractId, method, args = []) {
  const scArgs = args.map(toScVal);
  const sourceAccount = new Account(READ_ONLY_SOURCE, '0');
  const tx = buildTx(sourceAccount, contractId, method, scArgs);
  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractCallError(parseContractError(sim.error));
  }
  if (!sim.result) {
    return null;
  }
  return scValToNative(sim.result.retval);
}

/**
 * State-changing contract call. Simulates, asks Freighter to sign, submits,
 * then polls until the transaction lands.
 */
export async function invokeContract(contractId, method, args, walletAddress) {
  if (!walletAddress) {
    throw new ContractCallError('Connect your wallet first.');
  }
  const scArgs = args.map(toScVal);

  const sourceAccount = await server.getAccount(walletAddress);
  const tx = buildTx(sourceAccount, contractId, method, scArgs);
  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractCallError(parseContractError(sim.error));
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const signedXdr = await signXdr(prepared.toXDR(), NETWORK_PASSPHRASE);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendRes = await server.sendTransaction(signedTx);
  if (sendRes.status === 'ERROR') {
    throw new ContractCallError(parseContractError(sendRes.errorResult ?? sendRes));
  }

  const hash = sendRes.hash;
  const result = await pollTransaction(hash);
  return { hash, result };
}

async function pollTransaction(hash, attempts = 15, delayMs = 1500) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await server.getTransaction(hash);
    if (res.status === 'SUCCESS') {
      return res.returnValue ? scValToNative(res.returnValue) : null;
    }
    if (res.status === 'FAILED') {
      throw new ContractCallError('Transaction failed on-chain. Check the hash on Stellar Expert for details.');
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new ContractCallError('Timed out waiting for confirmation. Check the hash on Stellar Expert.');
}

function parseContractError(err) {
  const raw = typeof err === 'string' ? err : JSON.stringify(err);
  if (raw.includes('Error(Contract')) {
    return `Contract rejected the call: ${raw}`;
  }
  return raw || 'Unknown error from the Soroban RPC node.';
}

export function scv(value, type) {
  return { __scval: true, value: nativeToScVal(value, type ? { type } : undefined) };
}
