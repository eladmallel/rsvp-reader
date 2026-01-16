import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabBar, defaultTabs, Tab, TabId } from './TabBar';

describe('TabBar', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it('renders all tabs', () => {
    render(<TabBar tabs={defaultTabs} activeTab="library" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Feed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected', () => {
    render(<TabBar tabs={defaultTabs} activeTab="feed" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Feed' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(<TabBar tabs={defaultTabs} activeTab="library" onTabChange={mockOnTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Feed' }));

    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    expect(mockOnTabChange).toHaveBeenCalledWith('feed');
  });

  it('has correct aria-controls for each tab', () => {
    render(<TabBar tabs={defaultTabs} activeTab="library" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute(
      'aria-controls',
      'panel-library'
    );
    expect(screen.getByRole('tab', { name: 'Feed' })).toHaveAttribute(
      'aria-controls',
      'panel-feed'
    );
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
      'aria-controls',
      'panel-history'
    );
  });

  it('has tablist role on container', () => {
    render(<TabBar tabs={defaultTabs} activeTab="library" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders custom tabs', () => {
    const customTabs: Tab[] = [
      { id: 'library' as TabId, label: 'My Library' },
      { id: 'feed' as TabId, label: 'My Feed' },
    ];

    render(<TabBar tabs={customTabs} activeTab="library" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tab', { name: 'My Library' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Feed' })).toBeInTheDocument();
  });

  it('applies active class to active tab', () => {
    render(<TabBar tabs={defaultTabs} activeTab="history" onTabChange={mockOnTabChange} />);

    const historyTab = screen.getByRole('tab', { name: 'History' });
    expect(historyTab.className).toContain('active');
  });
});
