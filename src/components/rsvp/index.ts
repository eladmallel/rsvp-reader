export { WordDisplay, type WordDisplayProps } from './WordDisplay';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { Controls, type ControlsProps } from './Controls';
export {
  RSVPPlayer,
  useRSVPPlayer,
  type RSVPPlayerProps,
  type RSVPPlayerConfig,
  type RSVPPlayerReturn,
  type PlayerState,
} from './RSVPPlayer';

// Re-export calculateORPIndex from lib for backward compatibility
export { calculateORPIndex } from '@/lib/rsvp';
