import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders current and total labels', () => {
    render(<ProgressBar current={50} total={100} />);

    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    render(<ProgressBar current={25} total={100} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('handles 0 total gracefully', () => {
    render(<ProgressBar current={0} total={0} />);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<ProgressBar current={30} total={100} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '30');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-label', 'Reading progress: 30%');
  });

  it('hides labels when showLabels is false', () => {
    render(<ProgressBar current={50} total={100} showLabels={false} />);

    expect(screen.queryByText('50 / 100')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    // Progress bar should still exist
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('rounds percentage to whole number', () => {
    render(<ProgressBar current={33} total={100} />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('shows 100% when complete', () => {
    render(<ProgressBar current={100} total={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('sets correct width on fill element', () => {
    const { container } = render(<ProgressBar current={75} total={100} />);

    const fill = container.querySelector('[class*="fill"]');
    expect(fill).toHaveStyle({ width: '75%' });
  });
});
