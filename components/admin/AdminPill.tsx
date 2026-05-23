import React from 'react';
import styles from './AdminPill.module.css';

type PillTone = 'neutral' | 'paid' | 'unpaid' | 'info' | 'eagle' | 'birdie' | 'par' | 'danger';

interface AdminPillProps {
  children: React.ReactNode;
  tone?: PillTone;
}

export function AdminPill({ children, tone = 'neutral' }: AdminPillProps) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`}>
      {children}
    </span>
  );
}
