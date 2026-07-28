import './StatusNotice.css';

export default function StatusNotice({ kind = 'info', title, body, action }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div className="notice-body">
        {title ? <p className="notice-title">{title}</p> : null}
        {body ? <p className="notice-text">{body}</p> : null}
      </div>
      {action ? <div className="notice-action">{action}</div> : null}
    </div>
  );
}

export function LoadingRows({ count = 3 }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 64 }} />
      ))}
    </div>
  );
}
