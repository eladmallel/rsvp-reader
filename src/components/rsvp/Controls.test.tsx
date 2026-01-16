import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Controls } from './Controls';

const defaultProps = {
  isPlaying: false,
  wpm: 300,
  onPlayPause: vi.fn(),
  onRewind: vi.fn(),
  onForward: vi.fn(),
  onWpmChange: vi.fn(),
  onExit: vi.fn(),
};

describe('Controls', () => {
  it('renders play button when not playing', () => {
    render(<Controls {...defaultProps} isPlaying={false} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders pause button when playing', () => {
    render(<Controls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button clicked', () => {
    const onPlayPause = vi.fn();
    render(<Controls {...defaultProps} onPlayPause={onPlayPause} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('renders rewind button', () => {
    render(<Controls {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Rewind' })).toBeInTheDocument();
  });

  it('calls onRewind when rewind button clicked', () => {
    const onRewind = vi.fn();
    render(<Controls {...defaultProps} onRewind={onRewind} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rewind' }));
    expect(onRewind).toHaveBeenCalledTimes(1);
  });

  it('renders forward button', () => {
    render(<Controls {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
  });

  it('calls onForward when forward button clicked', () => {
    const onForward = vi.fn();
    render(<Controls {...defaultProps} onForward={onForward} />);

    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it('displays current WPM', () => {
    render(<Controls {...defaultProps} wpm={450} />);
    expect(screen.getByText('450 WPM')).toBeInTheDocument();
  });

  it('renders WPM slider', () => {
    render(<Controls {...defaultProps} />);
    expect(screen.getByRole('slider', { name: 'Words per minute' })).toBeInTheDocument();
  });

  it('calls onWpmChange when slider changes', () => {
    const onWpmChange = vi.fn();
    render(<Controls {...defaultProps} onWpmChange={onWpmChange} />);

    const slider = screen.getByRole('slider', { name: 'Words per minute' });
    fireEvent.change(slider, { target: { value: '500' } });

    expect(onWpmChange).toHaveBeenCalledWith(500);
  });

  it('renders exit button', () => {
    render(<Controls {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Exit reading mode' })).toBeInTheDocument();
  });

  it('calls onExit when exit button clicked', () => {
    const onExit = vi.fn();
    render(<Controls {...defaultProps} onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exit reading mode' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('uses custom min/max WPM values', () => {
    render(<Controls {...defaultProps} minWpm={50} maxWpm={500} />);

    const slider = screen.getByRole('slider', { name: 'Words per minute' });
    expect(slider).toHaveAttribute('min', '50');
    expect(slider).toHaveAttribute('max', '500');
  });

  it('slider value matches wpm prop', () => {
    render(<Controls {...defaultProps} wpm={350} />);

    const slider = screen.getByRole('slider', { name: 'Words per minute' });
    expect(slider).toHaveValue('350');
  });
});
