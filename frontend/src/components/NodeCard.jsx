import { estimateLatencyMs } from '../utils/latency';
import './NodeCard.css';

export default function NodeCard({ node, onRent, busy }) {
  const latency = estimateLatencyMs(node.country);

  return (
    <div className="node-card">
      <div className="node-card-top">
        <div>
          <p className="node-card-country">{node.country}</p>
          <p className="node-card-id mono">node #{node.id}</p>
        </div>
        <span className={`pill ${node.active ? '' : 'pill-inactive'}`}>
          <span className={`dot ${node.active ? 'dot-active' : ''}`} />
          {node.active ? 'active' : 'offline'}
        </span>
      </div>

      <div className="node-card-stats">
        <div>
          <span className="node-stat-label">Price</span>
          <span className="node-stat-value mono">{node.pricePerHourXlm.toFixed(2)} XLM/hr</span>
        </div>
        <div>
          <span className="node-stat-label">Est. latency*</span>
          <span className="node-stat-value mono">{latency} ms</span>
        </div>
        <div>
          <span className="node-stat-label">Rating</span>
          <span className="node-stat-value mono">
            {node.avgRating ? `${node.avgRating.toFixed(1)} / 5` : 'unrated'}
          </span>
        </div>
        <div>
          <span className="node-stat-label">Stake</span>
          <span className="node-stat-value mono">{node.stakeXlm.toFixed(0)} XLM</span>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={!node.active || busy}
        onClick={() => onRent(node)}
      >
        {busy ? <span className="spinner" /> : null}
        {node.active ? 'Rent this node' : 'Unavailable'}
      </button>
    </div>
  );
}
