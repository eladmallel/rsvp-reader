import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArticleCard, Article } from './ArticleCard';

const mockArticle: Article = {
  id: '1',
  title: 'Understanding React Server Components',
  author: 'Jane Doe',
  siteName: 'dev.to',
  readingTime: 8,
  tags: ['react', 'javascript', 'webdev'],
  createdAt: '2024-01-12T10:00:00.000Z',
};

describe('ArticleCard', () => {
  it('renders article title', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Understanding React Server Components')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders site name', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('dev.to')).toBeInTheDocument();
  });

  it('renders reading time', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('8 min read')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('webdev')).toBeInTheDocument();
  });

  it('limits displayed tags to 3 and shows count for more', () => {
    const articleWithManyTags: Article = {
      ...mockArticle,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    render(<ArticleCard article={articleWithManyTags} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ArticleCard article={mockArticle} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockArticle);
  });

  it('calls onClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    render(<ArticleCard article={mockArticle} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', () => {
    const handleClick = vi.fn();
    render(<ArticleCard article={mockArticle} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label for accessibility', () => {
    render(<ArticleCard article={mockArticle} onClick={() => {}} />);
    expect(
      screen.getByLabelText('Read Understanding React Server Components by Jane Doe')
    ).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    const articleWithImage: Article = {
      ...mockArticle,
      imageUrl: 'https://example.com/image.jpg',
    };
    const { container } = render(<ArticleCard article={articleWithImage} />);

    // Image has alt="" for decorative purposes, so we query by tag
    const image = container.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not render image when imageUrl is not provided', () => {
    const { container } = render(<ArticleCard article={mockArticle} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('has no role=button when onClick is not provided', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
