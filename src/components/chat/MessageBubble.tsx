import styles from './MessageBubble.module.css';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`${styles.container} ${isUser ? styles.user : styles.assistant}`}
      role="listitem"
    >
      <div className={styles.bubble}>
        <p className={styles.content}>{message.content}</p>
      </div>
      {message.timestamp && (
        <span className={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
