import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { listNodes, startSession } from '../utils/contracts';
import { isConfigured } from '../utils/config';
import NodeCard from './NodeCard';
import RentDialog from './RentDialog';
import StatusNotice, { LoadingRows } from './StatusNotice';
import './NodeMarketplace.css';

const SORTS = {
  price_asc: (a, b) => a.pricePerHourXlm - b.pricePerHourXlm,
  price_desc: (a, b) => b.pricePerHourXlm - a.pricePerHourXlm,
  rating: (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0),
};

export default function NodeMarketplace({ onSessionStarted }) {
  const { address, connected, connect } = useWallet();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [country, setCountry] = useState('all');
  const [sort, setSort] = useState('price_asc');
  const [activeNode, setActiveNode] = useState(null);
  const [renting, setRenting] = useState(false);
  const [rentError, setRentError] = useState(null);

  const configured = isConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    refresh();
  }, [configured]);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listNodes(50);
      setNodes(result);
    } catch (err) {
      setLoadError(err.message || 'Could not reach the Soroban RPC node.');
    } finally {
      setLoading(false);
    }
  }

  const countries = useMemo(() => {
    const set = new Set(nodes.map((n) => n.country));
    return ['all', ...Array.from(set)];
  }, [nodes]);

  const visible = useMemo(() => {
    let list = nodes;
    if (country !== 'all') list = list.filter((n) => n.country === country);
    return [...list].sort(SORTS[sort]);
  }, [nodes, country, sort]);

  async function handleRentClick(node) {
    if (!connected) {
      try {
        await connect();
      } catch {
        return;
      }
    }
    setRentError(null);
    setActiveNode(node);
  }

  async function handleConfirmRent(hours) {
    setRenting(true);
    setRentError(null);
    try {
      const { hash } = await startSession(address, activeNode.id, hours);
      setActiveNode(null);
      onSessionStarted?.({ nodeId: activeNode.id, hash });
      refresh();
    } catch (err) {
      setRentError(err.message || 'Transaction failed.');
    } finally {
      setRenting(false);
    }
  }

  if (!configured) {
    return (
      <section className="container marketplace">
        <StatusNotice
          kind="info"
          title="Contracts not deployed yet"
          body="Set VITE_NODE_REGISTRY_CONTRACT_ID and VITE_SESSION_MANAGER_CONTRACT_ID in .env, then rebuild. See DEPLOYMENT.md."
        />
      </section>
    );
  }

  return (
    <section className="container marketplace">
      <div className="marketplace-header">
        <div>
          <span className="eyebrow">Marketplace</span>
          <h2 className="marketplace-title">Live nodes</h2>
        </div>
        <div className="marketplace-controls">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="select">
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All regions' : c}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="select">
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Highest rated</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingRows count={4} /> : null}

      {!loading && loadError ? (
        <StatusNotice
          kind="error"
          title="Couldn't load nodes"
          body={loadError}
          action={
            <button className="btn" onClick={refresh}>
              Retry
            </button>
          }
        />
      ) : null}

      {!loading && !loadError && visible.length === 0 ? (
        <StatusNotice
          kind="empty"
          title="No nodes registered yet"
          body="Be the first provider — register a node from the Provider tab."
        />
      ) : null}

      {!loading && !loadError && visible.length > 0 ? (
        <div className="marketplace-grid">
          {visible.map((node) => (
            <NodeCard key={node.id} node={node} onRent={handleRentClick} busy={renting && activeNode?.id === node.id} />
          ))}
        </div>
      ) : null}

      {activeNode ? (
        <RentDialog
          node={activeNode}
          submitting={renting}
          error={rentError}
          onConfirm={handleConfirmRent}
          onClose={() => (renting ? null : setActiveNode(null))}
        />
      ) : null}
    </section>
  );
}
