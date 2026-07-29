import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Meridian crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Something broke on this screen</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Reload the page. If it keeps happening, the RPC endpoint may be unreachable.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
