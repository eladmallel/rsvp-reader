import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders input field with placeholder', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('Ask about this article...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(<ChatInput onSend={vi.fn()} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('enables send button when input has content', () => {
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });

    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
  });

  it('calls onSend with message content when send button clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending', () => {
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toHaveValue('');
  });

  it('sends message on Enter key press', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send on Shift+Enter (allows newlines)', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Line 1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('trims whitespace from message', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Test message  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send whitespace-only messages', () => {
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});
