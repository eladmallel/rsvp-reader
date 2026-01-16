import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedPrompts } from './SuggestedPrompts';

describe('SuggestedPrompts', () => {
  const mockPrompts = ['Summarize this', 'Key takeaways', 'Explain more'];

  it('renders all provided prompts', () => {
    render(<SuggestedPrompts prompts={mockPrompts} onSelect={vi.fn()} />);

    mockPrompts.forEach((prompt) => {
      expect(screen.getByRole('button', { name: prompt })).toBeInTheDocument();
    });
  });

  it('renders label text', () => {
    render(<SuggestedPrompts prompts={mockPrompts} onSelect={vi.fn()} />);
    expect(screen.getByText('Suggested questions:')).toBeInTheDocument();
  });

  it('calls onSelect with prompt text when clicked', () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts prompts={mockPrompts} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Summarize this' }));

    expect(onSelect).toHaveBeenCalledWith('Summarize this');
  });

  it('calls onSelect with correct prompt for each button', () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts prompts={mockPrompts} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Key takeaways' }));
    expect(onSelect).toHaveBeenCalledWith('Key takeaways');

    fireEvent.click(screen.getByRole('button', { name: 'Explain more' }));
    expect(onSelect).toHaveBeenCalledWith('Explain more');
  });

  it('renders default prompts when none provided', () => {
    // @ts-expect-error - testing default props behavior
    render(<SuggestedPrompts onSelect={vi.fn()} />);

    // Should render default prompts from the component
    expect(screen.getByRole('button', { name: 'Summarize this article' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What are the key takeaways?' })).toBeInTheDocument();
  });
});
