import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NodeMarketplace from '../components/NodeMarketplace';

vi.mock('../utils/config', () => ({
  isConfigured: () => true,
}));

vi.mock('../utils/contracts', () => ({
  listNodes: vi.fn(),
  startSession: vi.fn(),
}));

vi.mock('../context/WalletContext', () => ({
  useWallet: () => ({ address: 'GABC', connected: true, connect: vi.fn() }),
}));

import { listNodes } from '../utils/contracts';

const sampleNodes = [
  { id: 1, country: 'Germany', pricePerHourXlm: 2, stakeXlm: 60, active: true, avgRating: 4.2, ratingCount: 5, totalEarnedXlm: 10 },
  { id: 2, country: 'Singapore', pricePerHourXlm: 1, stakeXlm: 55, active: true, avgRating: null, ratingCount: 0, totalEarnedXlm: 0 },
];

describe('NodeMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state before nodes resolve', () => {
    listNodes.mockReturnValue(new Promise(() => {}));
    render(<NodeMarketplace />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('renders fetched nodes', async () => {
    listNodes.mockResolvedValue(sampleNodes);
    render(<NodeMarketplace />);
    await waitFor(() => expect(screen.getByText('node #1')).toBeInTheDocument());
    expect(screen.getByText('node #2')).toBeInTheDocument();
  });

  it('shows an error state when the RPC call fails', async () => {
    listNodes.mockRejectedValue(new Error('RPC unreachable'));
    render(<NodeMarketplace />);
    await waitFor(() => expect(screen.getByText(/rpc unreachable/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no nodes', async () => {
    listNodes.mockResolvedValue([]);
    render(<NodeMarketplace />);
    await waitFor(() => expect(screen.getByText(/no nodes registered yet/i)).toBeInTheDocument());
  });
});
