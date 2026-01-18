import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RSVPPlayer } from './RSVPPlayer';

// Mock the ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

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
    });

    it('renders empty state for no text', () => {
      render(<RSVPPlayer text="" />);

      expect(screen.getByText('No text to display')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<RSVPPlayer text="Hello" title="Test Article" />);

      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('renders source when provided', () => {
      render(<RSVPPlayer text="Hello" source="EXAMPLE.COM" />);

      expect(screen.getByText('EXAMPLE.COM')).toBeInTheDocument();
    });

    it('renders cockpit controls', () => {
      render(<RSVPPlayer text="Hello world" />);

      // Check for play/pause button (Play is default)
      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      // Check for skip buttons
      expect(screen.getByLabelText(/Skip back/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Skip forward/)).toBeInTheDocument();
    });

    it('renders WPM stepper', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      // The stepper shows the WPM value
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('WPM')).toBeInTheDocument();
    });

    it('renders progress bar with time', () => {
      render(<RSVPPlayer text="Hello world test" />);

      // Check for elapsed and remaining times (format: 00:00) - there are two of them
      const timeElements = screen.getAllByText('00:00');
      expect(timeElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/complete/)).toBeInTheDocument();
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
    });

    it('toggles between play and pause', () => {
      render(<RSVPPlayer text="Hello world" />);

      const button = screen.getByLabelText('Play');
      fireEvent.click(button);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Pause'));

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });
  });

  describe('word navigation', () => {
    it('skips words with skip buttons', () => {
      render(<RSVPPlayer text="First Second Third Fourth" initialSkipAmount={1} />);

      expect(screen.getByLabelText('Current word: First')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(/Skip forward/));

      expect(screen.getByLabelText('Current word: Second')).toBeInTheDocument();
    });

    it('goes back with skip back button', () => {
      render(<RSVPPlayer text="First Second Third Fourth" initialSkipAmount={1} />);

      // Go forward first
      fireEvent.click(screen.getByLabelText(/Skip forward/));
      expect(screen.getByLabelText('Current word: Second')).toBeInTheDocument();

      // Then skip back
      fireEvent.click(screen.getByLabelText(/Skip back/));
      expect(screen.getByLabelText('Current word: First')).toBeInTheDocument();
    });

    it('skips multiple words based on skip amount', () => {
      render(<RSVPPlayer text="One Two Three Four Five" initialSkipAmount={3} />);

      expect(screen.getByLabelText('Current word: One')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(/Skip forward/));

      expect(screen.getByLabelText('Current word: Four')).toBeInTheDocument();
    });
  });

  describe('WPM control', () => {
    it('changes WPM via stepper buttons', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      // Find the increase WPM button
      const increaseButton = screen.getByLabelText('Increase WPM');
      fireEvent.click(increaseButton);

      // WPM should increase by 10
      expect(screen.getByText('310')).toBeInTheDocument();
    });
  });

  describe('exit button', () => {
    it('calls onExit when back button is clicked', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello" onExit={onExit} />);

      fireEvent.click(screen.getByLabelText('Back to library'));

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('pauses playback when exiting', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello world" onExit={onExit} />);

      // Start playing
      fireEvent.click(screen.getByLabelText('Play'));

      // Exit
      fireEvent.click(screen.getByLabelText('Back to library'));

      // After exit, play button should be visible (paused)
      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });
  });

  describe('keyboard controls', () => {
    it('toggles play/pause with space key', () => {
      render(<RSVPPlayer text="Hello world" />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    it('navigates with arrow keys using skip amount', () => {
      render(<RSVPPlayer text="One Two Three Four Five" initialSkipAmount={2} />);

      expect(screen.getByLabelText('Current word: One')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByLabelText('Current word: Three')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByLabelText('Current word: One')).toBeInTheDocument();
    });

    it('adjusts WPM with up/down arrows', () => {
      render(<RSVPPlayer text="Hello" initialWpm={300} />);

      expect(screen.getByText('300')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(screen.getByText('310')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('calls onExit with Escape key', () => {
      const onExit = vi.fn();
      render(<RSVPPlayer text="Hello" onExit={onExit} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('settings panel', () => {
    it('opens settings panel when settings button is clicked', () => {
      render(<RSVPPlayer text="Hello" />);

      fireEvent.click(screen.getByLabelText('Player settings'));

      expect(screen.getByText('Player Settings')).toBeInTheDocument();
    });

    it('closes settings panel with Escape key', () => {
      render(<RSVPPlayer text="Hello" />);

      // Open settings
      fireEvent.click(screen.getByLabelText('Player settings'));
      expect(screen.getByText('Player Settings')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      // Settings should be closed
      expect(screen.queryByText('Player Settings')).not.toBeInTheDocument();
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
    it('has accessible word display', () => {
      render(<RSVPPlayer text="Hello" />);

      expect(screen.getByLabelText('Current word: Hello')).toBeInTheDocument();
    });

    it('has accessible skip buttons with skip amount', () => {
      render(<RSVPPlayer text="Hello world" initialSkipAmount={5} />);

      expect(screen.getByLabelText('Skip back 5 words')).toBeInTheDocument();
      expect(screen.getByLabelText('Skip forward 5 words')).toBeInTheDocument();
    });
  });
});
