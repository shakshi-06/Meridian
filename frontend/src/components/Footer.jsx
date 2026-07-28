import { NODE_REGISTRY_CONTRACT_ID, SESSION_MANAGER_CONTRACT_ID } from '../utils/config';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="footer-brand">VeilNet</div>
          <p className="footer-tagline">Independently run VPN nodes, coordinated by Soroban smart contracts.</p>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-heading">Contracts</span>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${NODE_REGISTRY_CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="footer-link mono"
            >
              NodeRegistry
            </a>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${SESSION_MANAGER_CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="footer-link mono"
            >
              SessionManager
            </a>
          </div>
          <div>
            <span className="footer-heading">Project</span>
            <a href="https://github.com/shakshi-06" target="_blank" rel="noreferrer" className="footer-link">
              GitHub
            </a>
            <a href="https://freighter.app" target="_blank" rel="noreferrer" className="footer-link">
              Freighter wallet
            </a>
          </div>
        </div>
      </div>
      <div className="container">
        <p className="footer-note">Built on Stellar Testnet for demonstration. Not audited, not for production traffic.</p>
      </div>
    </footer>
  );
}
