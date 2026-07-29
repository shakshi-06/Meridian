import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import './Navbar.css';

function shorten(address) {
  if (!address) return '';
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function Navbar({ activeView, onNavigate }) {
  const { address, connected, connecting, connect, disconnect, error } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { id: 'marketplace', label: 'Nodes' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'provider', label: 'Provider' },
    { id: 'activity', label: 'Activity' },
  ];

  const handleNav = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button className="navbar-brand" onClick={() => handleNav('home')}>
          <span className="navbar-mark" aria-hidden="true" />
          <span>Meridian</span>
        </button>

        <nav className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {links.map((link) => (
            <button
              key={link.id}
              className={`navbar-link ${activeView === link.id ? 'active' : ''}`}
              onClick={() => handleNav(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="navbar-actions">
          {connected ? (
            <button className="btn wallet-chip" onClick={disconnect} title="Disconnect wallet">
              <span className="dot dot-active" />
              <span className="mono">{shorten(address)}</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={connect} disabled={connecting}>
              {connecting ? <span className="spinner" /> : null}
              {connecting ? 'Connecting' : 'Connect wallet'}
            </button>
          )}
          <button
            className="navbar-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {error ? (
        <div className="container">
          <p className="navbar-error">{error}</p>
        </div>
      ) : null}
    </header>
  );
}
