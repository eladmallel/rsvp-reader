'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' };

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character type checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError('Signup failed. Please try again.');
        return;
      }

      if (!data.session) {
        setError('Check your email to confirm your account before signing in.');
        return;
      }

      const { error: profileError } = await supabase.from('users').upsert({
        id: userId,
        email: data.user?.email ?? email,
      });

      if (profileError) {
        setError('Account created, but profile setup failed. Please try logging in.');
        return;
      }

      router.push('/auth/connect-reader');
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthBarClass = (index: number): string => {
    if (index >= passwordStrength.score) return styles.strengthBar;

    switch (passwordStrength.score) {
      case 1:
        return `${styles.strengthBar} ${styles.weak}`;
      case 2:
        return `${styles.strengthBar} ${styles.medium}`;
      case 3:
        return `${styles.strengthBar} ${styles.strong}`;
      case 4:
        return `${styles.strengthBar} ${styles.veryStrong}`;
      default:
        return styles.strengthBar;
    }
  };

  return (
    <div className={styles.container}>
      <ThemeToggle className={styles.themeToggle} />
      <div className={styles.content}>
        {/* Logo/Brand */}
        <header className={styles.header}>
          <div className={styles.logoMark}>
            <span className={styles.logoLetter}>R</span>
          </div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Start speed reading with RSVP Reader</p>
        </header>

        {/* Signup Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error} role="alert">
              <svg
                className={styles.errorIcon}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {/* Password strength indicator */}
            {password && (
              <>
                <div className={styles.passwordStrength}>
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className={getStrengthBarClass(index)} />
                  ))}
                </div>
                <p className={styles.passwordHint}>
                  {passwordStrength.label && `${passwordStrength.label} - `}
                  At least 8 characters with a number and symbol
                </p>
              </>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Terms */}
        <p className={styles.terms}>
          By signing up, you agree to our{' '}
          <Link href="/terms" className={styles.link}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
        </p>

        {/* Login link */}
        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link href="/auth/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
