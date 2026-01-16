import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RSVPPlayer } from './RSVPPlayer';

describe('RSVPPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders with text', () => {
      render(<RSVPPlayer text="Hello world" />);

      // WordDisplay splits word into ORP parts, so check aria-label
      expect(screen.getByLabelText('Current word: Hello')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('renders empty state for no text', () => {
      render(<RSVPPlayer text="" />);

      expect(screen.getByText('No text to display')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<RSVPPlayer text="Hello" title="Test Article" />);

      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(<RSVPPlayer text="One Two Three" />);

      expect(screen.getByText('1 / 3')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders controls', () => {
      render(<RSVPPlayer text="Hello world" />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Rewind')).toBeInTheDocument();
      expect(screen.getByLabelText('Forward')).toBeInTheDocument();
      expect(screen.getByLabelText('Exit reading mode')).toBeInTheDocument();
    });

    it('renders WPM slider', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      const slider = screen.getByLabelText('Words per minute');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('300');
    });
  });

  describe('playback controls', () => {
    it('shows Play button initially', () => {
      render(<RSVPPlayer text="Hello world" />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    it('shows Pause button when playing', () => {
      render(<RSVPPlayer text="Hello world" />);

      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('toggles between play and pause', () => {
      render(<RSVPPlayer text="Hello world" />);

      const button = screen.getByLabelText('Play');
      fireEvent.click(button);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Pause'));

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });

  describe('word navigation', () => {
    it('advances word on forward button', () => {
      render(<RSVPPlayer text="First Second Third" />);

      expect(screen.getByLabelText('Current word: First')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Forward'));

      expect(screen.getByLabelText('Current word: Second')).toBeInTheDocument();
    });

    it('goes back on rewind button', () => {
      render(<RSVPPlayer text="First Second Third" />);

      // Go forward first
      fireEvent.click(screen.getByLabelText('Forward'));
      expect(screen.getByLabelText('Current word: Second')).toBeInTheDocument();

      // Then rewind
      fireEvent.click(screen.getByLabelText('Rewind'));
      expect(screen.getByLabelText('Current word: First')).toBeInTheDocument();
    });

    it('updates progress when navigating', () => {
      render(<RSVPPlayer text="One Two Three" />);

      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Forward'));

      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  describe('WPM control', () => {
    it('changes WPM via slider', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      const slider = screen.getByLabelText('Words per minute');
      fireEvent.change(slider, { target: { value: '500' } });

      expect(slider).toHaveValue('500');
      expect(screen.getByText('500 WPM')).toBeInTheDocument();
    });
  });

  describe('exit button', () => {
    it('calls onExit when exit button is clicked', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello" onExit={onExit} />);

      fireEvent.click(screen.getByLabelText('Exit reading mode'));

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('pauses playback when exiting', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello world" onExit={onExit} />);

      // Start playing
      fireEvent.click(screen.getByLabelText('Play'));
      expect(screen.getByText('Playing')).toBeInTheDocument();

      // Exit
      fireEvent.click(screen.getByLabelText('Exit reading mode'));

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });

  describe('keyboard controls', () => {
    it('toggles play/pause with space key', () => {
      render(<RSVPPlayer text="Hello world" />);

      expect(screen.getByText('Ready')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.getByText('Playing')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('navigates with arrow keys', () => {
      render(<RSVPPlayer text="One Two Three" />);

      expect(screen.getByLabelText('Current word: One')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByLabelText('Current word: Two')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByLabelText('Current word: Three')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByLabelText('Current word: Two')).toBeInTheDocument();
    });

    it('adjusts WPM with up/down arrows', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      const slider = screen.getByLabelText('Words per minute');
      expect(slider).toHaveValue('300');

      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(slider).toHaveValue('350');

      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(slider).toHaveValue('300');
    });

    it('calls onExit with Escape key', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello" onExit={onExit} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('resets with Home key', () => {
      render(<RSVPPlayer text="One Two Three" />);

      fireEvent.click(screen.getByLabelText('Forward'));
      fireEvent.click(screen.getByLabelText('Forward'));
      expect(screen.getByLabelText('Current word: Three')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Home' });

      expect(screen.getByLabelText('Current word: One')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('navigates sentences with shift+arrow', () => {
      render(<RSVPPlayer text="First sentence. Second sentence." />);

      expect(screen.getByLabelText('Current word: First')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });

      expect(screen.getByLabelText('Current word: Second')).toBeInTheDocument();
    });
  });

  describe('state display', () => {
    it('shows Ready state initially', () => {
      render(<RSVPPlayer text="Hello" />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('shows Playing state when playing', () => {
      render(<RSVPPlayer text="Hello world" />);

      fireEvent.click(screen.getByLabelText('Play'));

      expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('shows Paused state when paused', () => {
      render(<RSVPPlayer text="Hello world" />);

      fireEvent.click(screen.getByLabelText('Play'));
      fireEvent.click(screen.getByLabelText('Pause'));

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('shows Finished state when complete', () => {
      render(<RSVPPlayer text="One" />);

      fireEvent.click(screen.getByLabelText('Play'));

      // Advance past the word
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('Finished')).toBeInTheDocument();
    });
  });

  describe('onComplete callback', () => {
    it('calls onComplete when reading finishes', () => {
      const onComplete = vi.fn();
      render(<RSVPPlayer text="One" onComplete={onComplete} />);

      fireEvent.click(screen.getByLabelText('Play'));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has accessible progress bar', () => {
      render(<RSVPPlayer text="One Two Three" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '3');
    });

    it('has accessible word display', () => {
      render(<RSVPPlayer text="Hello" />);

      expect(screen.getByLabelText('Current word: Hello')).toBeInTheDocument();
    });

    it('announces state changes', () => {
      render(<RSVPPlayer text="Hello world" />);

      const stateIndicator = screen.getByText('Ready').parentElement;
      expect(stateIndicator).toHaveAttribute('aria-live', 'polite');
    });
  });
});
