import './Hero.css';

export default function Hero({ onEnter, nodeCount }) {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">Soroban · Stellar Testnet</span>
          <h1 className="hero-title">
            A VPN with no
            <br />
            single operator to trust.
          </h1>
          <p className="hero-sub">
            Meridian routes traffic through independently run exit nodes. Every node stakes
            collateral on-chain, every session is paid and rated on-chain, and no company sits in
            the middle holding logs or a kill switch.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onEnter('marketplace')}>
              Browse nodes
            </button>
            <button className="btn" onClick={() => onEnter('provider')}>
              Run a node
            </button>
          </div>
          <div className="hero-stats">
            <div>
              <span className="hero-stat-value mono">{nodeCount ?? '—'}</span>
              <span className="hero-stat-label">nodes on registry</span>
            </div>
            <div>
              <span className="hero-stat-value mono">2</span>
              <span className="hero-stat-label">contracts, cross-calling</span>
            </div>
            <div>
              <span className="hero-stat-value mono">0</span>
              <span className="hero-stat-label">central servers</span>
            </div>
          </div>
        </div>

        <div className="hero-diagram" aria-hidden="true">
          <RouteDiagram />
        </div>
      </div>
    </section>
  );
}

function RouteDiagram() {
  return (
    <svg viewBox="0 0 340 320" className="route-svg" role="img" aria-label="Routing diagram">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>

      <line x1="60" y1="60" x2="170" y2="150" className="route-line" markerEnd="url(#arrow)" />
      <line x1="170" y1="150" x2="280" y2="70" className="route-line route-line-dim" />
      <line x1="170" y1="150" x2="90" y2="250" className="route-line route-line-dim" />
      <line x1="170" y1="150" x2="260" y2="240" className="route-line route-line-dim" />

      <g>
        <circle cx="60" cy="60" r="20" className="route-node route-node-user" />
        <text x="60" y="95" textAnchor="middle" className="route-label">
          You
        </text>
      </g>

      <g>
        <rect x="145" y="125" width="50" height="50" rx="8" className="route-node route-node-contract" />
        <text x="170" y="188" textAnchor="middle" className="route-label">
          SessionManager
        </text>
      </g>

      <g>
        <circle cx="280" cy="70" r="14" className="route-node route-node-exit-active" />
        <text x="280" y="50" textAnchor="middle" className="route-label route-label-small">
          Node · Frankfurt
        </text>
      </g>
      <g>
        <circle cx="90" cy="250" r="14" className="route-node route-node-exit" />
        <text x="90" y="278" textAnchor="middle" className="route-label route-label-small">
          Node · Singapore
        </text>
      </g>
      <g>
        <circle cx="260" cy="240" r="14" className="route-node route-node-exit" />
        <text x="260" y="268" textAnchor="middle" className="route-label route-label-small">
          Node · São Paulo
        </text>
      </g>
    </svg>
  );
}
