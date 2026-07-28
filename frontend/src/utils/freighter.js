import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api';

export const EXPECTED_NETWORK = 'TESTNET';

export async function freighterAvailable() {
  const res = await isConnected();
  return Boolean(res?.isConnected);
}

export async function connectFreighter() {
  const available = await freighterAvailable();
  if (!available) {
    throw new Error('Freighter is not installed. Install the extension from freighter.app and reload.');
  }

  const allowed = await isAllowed();
  if (!allowed?.isAllowed) {
    const access = await setAllowed();
    if (!access?.isAllowed) {
      const req = await requestAccess();
      if (req?.error) {
        throw new Error(req.error);
      }
    }
  }

  const addressRes = await getAddress();
  if (addressRes?.error) {
    throw new Error(addressRes.error);
  }

  const networkRes = await getNetwork();
  if (networkRes?.network && networkRes.network !== EXPECTED_NETWORK) {
    throw new Error(
      `Freighter is on ${networkRes.network}. Switch it to ${EXPECTED_NETWORK} to use VeilNet.`
    );
  }

  return { address: addressRes.address, network: networkRes?.network };
}

export async function signXdr(xdr, networkPassphrase) {
  const res = await signTransaction(xdr, { networkPassphrase });
  if (res?.error) {
    throw new Error(res.error);
  }
  return res.signedTxXdr ?? res.signedXDR ?? res;
}
