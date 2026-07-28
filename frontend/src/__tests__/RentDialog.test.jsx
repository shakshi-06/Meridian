import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RentDialog from '../components/RentDialog';

const node = { id: 7, country: 'Singapore', pricePerHourXlm: 2 };

describe('RentDialog', () => {
  it('shows the initial escrow total for 1 hour', () => {
    render(<RentDialog node={node} onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByText('2.00 XLM')).toBeInTheDocument();
  });

  it('recalculates total when duration changes', () => {
    render(<RentDialog node={node} onConfirm={() => {}} onClose={() => {}} />);
    const input = screen.getByLabelText(/duration/i);
    fireEvent.change(input, { target: { value: '5' } });
    expect(screen.getByText('10.00 XLM')).toBeInTheDocument();
  });

  it('calls onConfirm with the chosen hours', async () => {
    const onConfirm = vi.fn();
    render(<RentDialog node={node} onConfirm={onConfirm} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /confirm & pay/i }));
    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<RentDialog node={node} onConfirm={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
