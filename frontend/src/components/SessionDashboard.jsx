import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { endSession, getSession, getSessionsByUser } from '../utils/contracts';
import StatusNotice, { LoadingRows } from './StatusNotice';
import './SessionDashboard.css';

function remaining(session) {
  const endsAt = (session.startTime + session.durationHours * 3600) * 1000;
  const diff = endsAt - Date.now();
  if (diff <= 0) return 'expired';
  const hrs = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return `${hrs}h ${mins}m left`;
}

export default function SessionDashboard() {
  const { address, connected, connect } = useWallet();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState({});
  const [ending, setEnding] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (connected) load();
  }, [connected, address]);

  useEffect(() => {
    const id = setInterval(() => forceTick((v) => v + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const ids = await getSessionsByUser(address);
      const full = await Promise.all(ids.map((id) => getSession(id)));
      setSessions(full.filter(Boolean).reverse());
    } catch (err) {
      setError(err.message || 'Could not load your sessions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd(session) {
    const r = rating[session.id] || 5;
    setEnding(session.id);
    setError(null);
    try {
      await endSession(address, session.id, r);
      await load();
    } catch (err) {
      setError(err.message || 'Could not end session.');
    } finally {
      setEnding(null);
    }
  }

  if (!connected) {
    return (
      <section className="container session-dash">
        <StatusNotice
          kind="info"
          title="Connect your wallet"
          body="Your rented sessions and spend history live here once Freighter is connected."
          action={
            <button className="btn btn-primary" onClick={connect}>
              Connect wallet
            </button>
          }
        />
      </section>
    );
  }

  const active = sessions.filter((s) => s.status === 'Active');
  const past = sessions.filter((s) => s.status !== 'Active');
  const totalSpend = sessions.reduce((sum, s) => sum + s.amountXlm, 0);

  return (
    <section className="container session-dash">
      <div className="session-summary">
        <span className="eyebrow">Your sessions</span>
        <h2 className="session-title">Session dashboard</h2>
        <div className="session-summary-row">
          <div>
            <span className="node-stat-label">Active</span>
            <span className="node-stat-value mono">{active.length}</span>
          </div>
          <div>
            <span className="node-stat-label">Total sessions</span>
            <span className="node-stat-value mono">{sessions.length}</span>
          </div>
          <div>
            <span className="node-stat-label">Total spend</span>
            <span className="node-stat-value mono">{totalSpend.toFixed(2)} XLM</span>
          </div>
        </div>
      </div>

      {loading ? <LoadingRows count={2} /> : null}
      {!loading && error ? (
        <StatusNotice kind="error" title="Something went wrong" body={error} action={<button className="btn" onClick={load}>Retry</button>} />
      ) : null}
      {!loading && !error && sessions.length === 0 ? (
        <StatusNotice kind="empty" title="No sessions yet" body="Rent a node from the marketplace to start your first session." />
      ) : null}

      {active.length > 0 ? (
        <div className="session-list">
          {active.map((s) => (
            <div className="session-card" key={s.id}>
              <div className="session-card-row">
                <div>
                  <p className="session-card-title">Session #{s.id} · Node #{s.nodeId}</p>
                  <p className="session-card-sub mono">{remaining(s)}</p>
                </div>
                <span className="pill">
                  <span className="dot dot-active" /> active
                </span>
              </div>
              <div className="session-card-row session-card-meta">
                <span className="mono">{s.amountXlm.toFixed(2)} XLM escrowed</span>
                <span className="mono">{s.durationHours}h rented</span>
              </div>
              <div className="session-end-row">
                <select
                  className="select"
                  value={rating[s.id] || 5}
                  onChange={(e) => setRating((r) => ({ ...r, [s.id]: Number(e.target.value) }))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      Rate {n} / 5
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" disabled={ending === s.id} onClick={() => handleEnd(s)}>
                  {ending === s.id ? <span className="spinner" /> : null}
                  End & release payment
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {past.length > 0 ? (
        <div className="session-history">
          <span className="eyebrow">History</span>
          <table className="session-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Node</th>
                <th>Hours</th>
                <th>Paid</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {past.map((s) => (
                <tr key={s.id}>
                  <td className="mono">#{s.id}</td>
                  <td className="mono">#{s.nodeId}</td>
                  <td className="mono">{s.durationHours}h</td>
                  <td className="mono">{s.amountXlm.toFixed(2)} XLM</td>
                  <td className="mono">{s.rating}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
