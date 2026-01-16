import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble, type Message } from './MessageBubble';

describe('MessageBubble', () => {
  const userMessage: Message = {
    id: '1',
    role: 'user',
    content: 'Hello, AI!',
  };

  const assistantMessage: Message = {
    id: '2',
    role: 'assistant',
    content: 'Hello! How can I help you?',
  };

  it('renders user message content', () => {
    render(<MessageBubble message={userMessage} />);
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
  });

  it('renders assistant message content', () => {
    render(<MessageBubble message={assistantMessage} />);
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
  });

  it('applies user styling for user messages', () => {
    const { container } = render(<MessageBubble message={userMessage} />);
    const messageContainer = container.firstChild as HTMLElement;
    expect(messageContainer.className).toContain('user');
  });

  it('applies assistant styling for assistant messages', () => {
    const { container } = render(<MessageBubble message={assistantMessage} />);
    const messageContainer = container.firstChild as HTMLElement;
    expect(messageContainer.className).toContain('assistant');
  });

  it('renders timestamp when provided', () => {
    const messageWithTimestamp: Message = {
      ...userMessage,
      timestamp: new Date('2026-01-16T10:30:00'),
    };
    render(<MessageBubble message={messageWithTimestamp} />);
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
  });

  it('does not render timestamp when not provided', () => {
    render(<MessageBubble message={userMessage} />);
    // No timestamp element should exist
    const container = screen.getByRole('listitem');
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('has listitem role for accessibility', () => {
    render(<MessageBubble message={userMessage} />);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
