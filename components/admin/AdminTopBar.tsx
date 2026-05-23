import React from 'react';
import { EVENT_FACTS } from '@/lib/mockData';
import styles from './AdminTopBar.module.css';

interface AdminTopBarProps {
  title: string;
  action?: React.ReactNode;
}

export function AdminTopBar({ title, action }: AdminTopBarProps) {
  return (
    <div className={styles.topBar}>
      <div className={styles.titleBlock}>
        <div className={styles.eyebrow}>
          Admin · {EVENT_FACTS.daysOut} days out
        </div>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
