import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagFilter } from './TagFilter';

const mockTags = ['react', 'typescript', 'webdev', 'javascript'];

describe('TagFilter', () => {
  const mockOnTagSelect = vi.fn();

  beforeEach(() => {
    mockOnTagSelect.mockClear();
  });

  it('renders All button', () => {
    render(<TagFilter tags={mockTags} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<TagFilter tags={mockTags} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    mockTags.forEach((tag) => {
      expect(screen.getByRole('button', { name: tag })).toBeInTheDocument();
    });
  });

  it('marks All as active when no tag is selected', () => {
    render(<TagFilter tags={mockTags} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    const allButton = screen.getByRole('button', { name: 'All' });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
    expect(allButton.className).toContain('active');
  });

  it('marks selected tag as active', () => {
    render(<TagFilter tags={mockTags} selectedTag="react" onTagSelect={mockOnTagSelect} />);

    const reactButton = screen.getByRole('button', { name: 'react' });
    const allButton = screen.getByRole('button', { name: 'All' });

    expect(reactButton).toHaveAttribute('aria-pressed', 'true');
    expect(reactButton.className).toContain('active');
    expect(allButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onTagSelect with tag when tag is clicked', () => {
    render(<TagFilter tags={mockTags} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'typescript' }));

    expect(mockOnTagSelect).toHaveBeenCalledTimes(1);
    expect(mockOnTagSelect).toHaveBeenCalledWith('typescript');
  });

  it('calls onTagSelect with null when All is clicked', () => {
    render(<TagFilter tags={mockTags} selectedTag="react" onTagSelect={mockOnTagSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(mockOnTagSelect).toHaveBeenCalledTimes(1);
    expect(mockOnTagSelect).toHaveBeenCalledWith(null);
  });

  it('has correct accessibility role', () => {
    render(<TagFilter tags={mockTags} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Filter by tag');
  });

  it('renders empty state with only All button when no tags', () => {
    render(<TagFilter tags={[]} selectedTag={null} onTagSelect={mockOnTagSelect} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
