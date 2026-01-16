import styles from './SuggestedPrompts.module.css';

export interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

const defaultPrompts = [
  'Summarize this article',
  'What are the key takeaways?',
  'Explain the main argument',
  'What questions does this raise?',
];

export function SuggestedPrompts({ prompts = defaultPrompts, onSelect }: SuggestedPromptsProps) {
  return (
    <div className={styles.container}>
      <p className={styles.label}>Suggested questions:</p>
      <div className={styles.prompts}>
        {prompts.map((prompt, index) => (
          <button key={index} className={styles.prompt} onClick={() => onSelect(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
