import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  deactivateNode,
  getNode,
  getNodesByOwner,
  reactivateNode,
  registerNode,
  withdrawStake,
} from '../utils/contracts';
import StatusNotice, { LoadingRows } from './StatusNotice';
import './ProviderDashboard.css';

const initialForm = { country: '', endpointPlaintext: '', priceXlm: '1', stakeXlm: '50' };

export default function ProviderDashboard() {
  const { address, connected, connect } = useWallet();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [txInfo, setTxInfo] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busyNode, setBusyNode] = useState(null);

  useEffect(() => {
    if (connected) load();
  }, [connected, address]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const ids = await getNodesByOwner(address);
      const full = await Promise.all(ids.map((id) => getNode(id)));
      setNodes(full.filter(Boolean));
    } catch (err) {
      setLoadError(err.message || 'Could not load your nodes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.country.trim() || !form.endpointPlaintext.trim()) {
      setFormError('Country and endpoint are required.');
      return;
    }
    if (Number(form.stakeXlm) < 50) {
      setFormError('Minimum stake is 50 XLM.');
      return;
    }
    setSubmitting(true);
    try {
      const { hash } = await registerNode(address, {
        country: form.country.trim(),
        endpointPlaintext: form.endpointPlaintext.trim(),
        priceXlm: Number(form.priceXlm),
        stakeXlm: Number(form.stakeXlm),
      });
      setTxInfo(hash);
      setForm(initialForm);
      await load();
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(node) {
    setBusyNode(node.id);
    try {
      if (node.active) {
        await deactivateNode(address, node.id);
      } else {
        await reactivateNode(address, node.id);
      }
      await load();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusyNode(null);
    }
  }

  async function handleWithdraw(node) {
    setBusyNode(node.id);
    try {
      await withdrawStake(address, node.id);
      await load();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusyNode(null);
    }
  }

  if (!connected) {
    return (
      <section className="container provider-dash">
        <StatusNotice
          kind="info"
          title="Connect your wallet to run a node"
          body="Node registration and stake are tied to your Freighter address."
          action={
            <button className="btn btn-primary" onClick={connect}>
              Connect wallet
            </button>
          }
        />
      </section>
    );
  }

  const totalEarned = nodes.reduce((sum, n) => sum + n.totalEarnedXlm, 0);
  const totalStaked = nodes.reduce((sum, n) => sum + n.stakeXlm, 0);

  return (
    <section className="container provider-dash">
      <span className="eyebrow">Provider</span>
      <h2 className="provider-title">Run a node</h2>

      <div className="provider-grid">
        <form className="card provider-form" onSubmit={handleSubmit}>
          <h3 className="provider-form-title">Register a new node</h3>
          <label className="dialog-label">Country / region</label>
          <input
            className="dialog-input"
            placeholder="e.g. Germany"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          />

          <label className="dialog-label">Exit endpoint</label>
          <input
            className="dialog-input"
            placeholder="node IP or hostname — hashed before it ever leaves your browser"
            value={form.endpointPlaintext}
            onChange={(e) => setForm((f) => ({ ...f, endpointPlaintext: e.target.value }))}
          />

          <div className="provider-form-cols">
            <div>
              <label className="dialog-label">Price / hour (XLM)</label>
              <input
                className="dialog-input"
                type="number"
                min="0.01"
                step="0.01"
                value={form.priceXlm}
                onChange={(e) => setForm((f) => ({ ...f, priceXlm: e.target.value }))}
              />
            </div>
            <div>
              <label className="dialog-label">Stake (min 50 XLM)</label>
              <input
                className="dialog-input"
                type="number"
                min="50"
                step="1"
                value={form.stakeXlm}
                onChange={(e) => setForm((f) => ({ ...f, stakeXlm: e.target.value }))}
              />
            </div>
          </div>

          {formError ? <p className="dialog-error">{formError}</p> : null}
          {txInfo ? <p className="provider-success mono">Registered — tx {txInfo.slice(0, 10)}…</p> : null}

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" /> : null}
            {submitting ? 'Confirm in Freighter' : 'Lock stake & register'}
          </button>
        </form>

        <div className="provider-summary card">
          <h3 className="provider-form-title">Your provider stats</h3>
          <div className="provider-stats-row">
            <div>
              <span className="node-stat-label">Nodes run</span>
              <span className="node-stat-value mono">{nodes.length}</span>
            </div>
            <div>
              <span className="node-stat-label">Total staked</span>
              <span className="node-stat-value mono">{totalStaked.toFixed(0)} XLM</span>
            </div>
            <div>
              <span className="node-stat-label">Total earned</span>
              <span className="node-stat-value mono">{totalEarned.toFixed(2)} XLM</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingRows count={2} /> : null}
      {!loading && loadError ? <StatusNotice kind="error" title="Something went wrong" body={loadError} /> : null}
      {!loading && !loadError && nodes.length === 0 ? (
        <StatusNotice kind="empty" title="You haven't registered a node yet" body="Use the form above to list your first exit node." />
      ) : null}

      {nodes.length > 0 ? (
        <div className="provider-node-list">
          {nodes.map((n) => (
            <div key={n.id} className="provider-node-row">
              <div>
                <p className="session-card-title">Node #{n.id} · {n.country}</p>
                <p className="session-card-meta mono">
                  {n.pricePerHourXlm.toFixed(2)} XLM/hr · stake {n.stakeXlm.toFixed(0)} XLM · earned {n.totalEarnedXlm.toFixed(2)} XLM
                  {n.avgRating ? ` · ${n.avgRating.toFixed(1)}/5 (${n.ratingCount})` : ' · unrated'}
                </p>
              </div>
              <div className="provider-node-actions">
                <button className="btn" disabled={busyNode === n.id} onClick={() => handleToggle(n)}>
                  {n.active ? 'Deactivate' : 'Reactivate'}
                </button>
                {!n.active && n.stakeXlm > 0 ? (
                  <button className="btn" disabled={busyNode === n.id} onClick={() => handleWithdraw(n)}>
                    Withdraw stake
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
