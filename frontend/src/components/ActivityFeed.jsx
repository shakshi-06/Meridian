import { useEffect, useRef, useState } from 'react';
import { fetchRecentEvents } from '../utils/events';
import { isConfigured } from '../utils/config';
import StatusNotice, { LoadingRows } from './StatusNotice';
import './ActivityFeed.css';

const POLL_MS = 12000;

function describe(event) {
  switch (event.label) {
    case 'reg_node': {
      const [id, country] = Array.isArray(event.value) ? event.value : [];
      return `New node registered in ${country ?? 'unknown region'} (#${id})`;
    }
    case 'deactiv':
      return `Node #${event.value} taken offline by its operator`;
    case 'rated':
      return `Node #${event.topics[1] ?? '?'} received a ${event.value}/5 rating`;
    case 'start': {
      const [id, nodeId, amount] = Array.isArray(event.value) ? event.value : [];
      return `Session #${id} started on node #${nodeId} — ${(Number(amount) / 1e7).toFixed(2)} XLM escrowed`;
    }
    case 'end': {
      const [id, rating] = Array.isArray(event.value) ? event.value : [];
      return `Session #${id} settled — rated ${rating}/5`;
    }
    default:
      return `${event.label} event`;
  }
}

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isConfigured()) {
      setLoading(false);
      return;
    }
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  async function poll() {
    try {
      const res = await fetchRecentEvents(30);
      setEvents(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not reach the events endpoint.');
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured()) {
    return (
      <section className="container activity">
        <StatusNotice kind="info" title="Contracts not deployed yet" body="Activity streams here once contract IDs are configured." />
      </section>
    );
  }

  return (
    <section className="container activity">
      <div className="activity-header">
        <div>
          <span className="eyebrow">Live</span>
          <h2 className="activity-title">Network activity</h2>
        </div>
        <span className="pill">
          <span className="dot dot-active" /> polling every 12s
        </span>
      </div>

      {loading ? <LoadingRows count={5} /> : null}
      {!loading && error ? (
        <StatusNotice kind="error" title="Feed interrupted" body={error} action={<button className="btn" onClick={poll}>Retry</button>} />
      ) : null}
      {!loading && !error && events.length === 0 ? (
        <StatusNotice kind="empty" title="No events yet" body="Register a node or start a session to see it appear here." />
      ) : null}

      {!loading && events.length > 0 ? (
        <ul className="activity-list">
          {events.map((e) => (
            <li className="activity-row" key={e.id}>
              <span className="dot dot-active activity-dot" />
              <div>
                <p className="activity-text">{describe(e)}</p>
                <p className="activity-meta mono">ledger {e.ledger} · {e.contractId.slice(0, 6)}…</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
