import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import NodeCard from '../components/NodeCard';

const activeNode = {
  id: 3,
  country: 'Germany',
  pricePerHourXlm: 1.5,
  stakeXlm: 60,
  active: true,
  avgRating: 4.5,
  ratingCount: 2,
};

const inactiveNode = { ...activeNode, id: 4, active: false };

describe('NodeCard', () => {
  it('renders node details', () => {
    render(<NodeCard node={activeNode} onRent={() => {}} />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('1.50 XLM/hr')).toBeInTheDocument();
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
  });

  it('calls onRent when the button is clicked on an active node', async () => {
    const onRent = vi.fn();
    render(<NodeCard node={activeNode} onRent={onRent} />);
    await userEvent.click(screen.getByRole('button', { name: /rent this node/i }));
    expect(onRent).toHaveBeenCalledWith(activeNode);
  });

  it('disables the rent button for inactive nodes', () => {
    render(<NodeCard node={inactiveNode} onRent={() => {}} />);
    expect(screen.getByRole('button', { name: /unavailable/i })).toBeDisabled();
  });
});
