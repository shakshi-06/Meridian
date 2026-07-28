import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import NodeMarketplace from './components/NodeMarketplace';
import SessionDashboard from './components/SessionDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import ActivityFeed from './components/ActivityFeed';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import StatusNotice from './components/StatusNotice';
import { listNodes } from './utils/contracts';
import { isConfigured } from './utils/config';

export default function App() {
  const [view, setView] = useState('home');
  const [nodeCount, setNodeCount] = useState(null);
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    if (!isConfigured()) return;
    listNodes(100)
      .then((n) => setNodeCount(n.length))
      .catch(() => setNodeCount(null));
  }, []);

  return (
    <ErrorBoundary>
      <Navbar activeView={view} onNavigate={setView} />

      {lastSession ? (
        <div className="container" style={{ paddingTop: 16 }}>
          <StatusNotice
            kind="info"
            title="Session started"
            body={`Node #${lastSession.nodeId} rented — tx ${lastSession.hash.slice(0, 12)}…`}
            action={
              <a
                className="btn"
                href={`https://stellar.expert/explorer/testnet/tx/${lastSession.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction
              </a>
            }
          />
        </div>
      ) : null}

      {view === 'home' ? (
        <>
          <Hero onEnter={setView} nodeCount={nodeCount} />
          <HowItWorks />
        </>
      ) : null}

      {view === 'marketplace' ? <NodeMarketplace onSessionStarted={setLastSession} /> : null}
      {view === 'sessions' ? <SessionDashboard /> : null}
      {view === 'provider' ? <ProviderDashboard /> : null}
      {view === 'activity' ? <ActivityFeed /> : null}

      <Footer />
    </ErrorBoundary>
  );
}
