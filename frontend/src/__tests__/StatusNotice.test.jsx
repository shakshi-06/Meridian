import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusNotice from '../components/StatusNotice';

describe('StatusNotice', () => {
  it('renders title and body text', () => {
    render(<StatusNotice kind="error" title="Failed" body="Something broke" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('uses an alert role for error notices', () => {
    render(<StatusNotice kind="error" title="Failed" body="Something broke" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses a status role for non-error notices', () => {
    render(<StatusNotice kind="info" title="FYI" body="Just so you know" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders an action when provided', () => {
    render(<StatusNotice kind="empty" title="Nothing here" action={<button>Retry</button>} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
