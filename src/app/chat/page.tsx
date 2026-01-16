'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageBubble, ChatInput, SuggestedPrompts, type Message } from '@/components/chat';
import styles from './page.module.css';

// Mock article context for prototype
const mockArticle = {
  title: 'Understanding React Server Components',
  author: 'Dan Abramov',
};

// Initial messages for prototype (no timestamp to avoid hydration mismatch)
const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: `I'm here to help you understand "${mockArticle.title}" by ${mockArticle.author}. Feel free to ask me any questions about the article!`,
  },
];

// Mock responses for prototype
const mockResponses: Record<string, string> = {
  'Summarize this article':
    'This article explains React Server Components (RSC), a new paradigm that allows components to render on the server. Key points include: 1) Server Components reduce bundle size by keeping server-only code off the client, 2) They enable direct database access from components, 3) They work alongside Client Components for interactivity.',
  'What are the key takeaways?':
    'Key takeaways:\n\n1. Server Components render on the server and send HTML to the client\n2. They can access backend resources directly (databases, file system)\n3. Client Components are still needed for interactivity\n4. The "use client" directive marks client boundaries\n5. This architecture significantly reduces JavaScript bundle size',
  'Explain the main argument':
    'The main argument is that the traditional React model of sending all component code to the client is inefficient. Server Components solve this by:\n\n- Keeping data fetching on the server\n- Eliminating client-side waterfalls\n- Reducing the amount of JavaScript shipped to browsers\n\nThis leads to faster page loads and better user experience.',
  'What questions does this raise?':
    'Some questions this article raises:\n\n1. How do Server Components handle authentication and user-specific data?\n2. What are the caching strategies for Server Components?\n3. How does this affect existing React applications?\n4. What are the debugging tools available for Server Components?\n5. How do you handle errors that occur on the server?',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(
      () => {
        const response =
          mockResponses[content] ||
          `That's a great question about "${mockArticle.title}". In a real implementation, this would be answered by the LLM based on the article content. The AI would analyze the full text and provide a relevant, contextual response.`;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      },
      1000 + Math.random() * 1000
    );
  }, []);

  const showSuggestions = messages.length <= 1;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← Back
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Chat</h1>
          <p className={styles.subtitle}>{mockArticle.title}</p>
        </div>
      </header>

      {/* Messages area */}
      <main className={styles.main}>
        <div className={styles.messages} role="list" aria-label="Chat messages">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && (
            <div className={styles.typing}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts - show only at start */}
        {showSuggestions && (
          <SuggestedPrompts prompts={Object.keys(mockResponses)} onSelect={handleSend} />
        )}
      </main>

      {/* Input area */}
      <footer className={styles.footer}>
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </footer>
    </div>
  );
}
