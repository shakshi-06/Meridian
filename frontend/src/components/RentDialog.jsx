import { useState } from 'react';
import './RentDialog.css';

export default function RentDialog({ node, onConfirm, onClose, submitting, error }) {
  const [hours, setHours] = useState(1);
  const total = (node.pricePerHourXlm * hours).toFixed(2);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Rent node #{node.id}</h3>
        <p className="dialog-sub">{node.country} · {node.pricePerHourXlm.toFixed(2)} XLM / hour</p>

        <label className="dialog-label" htmlFor="hours">
          Duration (hours)
        </label>
        <input
          id="hours"
          type="number"
          min="1"
          max="720"
          value={hours}
          onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
          className="dialog-input"
        />

        <div className="dialog-total">
          <span>Total escrowed</span>
          <span className="mono">{total} XLM</span>
        </div>

        {error ? <p className="dialog-error">{error}</p> : null}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onConfirm(hours)} disabled={submitting}>
            {submitting ? <span className="spinner" /> : null}
            {submitting ? 'Confirm in Freighter' : 'Confirm & pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
