'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('eddie@psu-cincy.org');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Mock login — in production this calls Supabase auth
    await new Promise((r) => setTimeout(r, 600));
    if (password === '' || email) {
      router.push('/admin');
    } else {
      setError('Invalid credentials. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo mark */}
        <div className={styles.logoArea}>
          <div className={styles.logoMark}>
            <span className={styles.logoText}>PSU</span>
            <span className={styles.logoDot} />
          </div>
          <div className={styles.logoSub}>Greater Cincinnati</div>
        </div>

        <h1 className={styles.heading}>Admin sign in</h1>
        <p className={styles.sub}>Drive Out Hunger 2026</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@psu-cincy.org"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className={styles.submitBtn}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.hint}>
          Members of the golf outing committee only.
        </p>
      </div>
    </div>
  );
}
