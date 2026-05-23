import React from 'react';
import styles from './AdminCard.module.css';

interface AdminCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: number | string;
  className?: string;
}

export function AdminCard({ title, action, children, padding = 20, className }: AdminCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      {(title || action) && (
        <div className={styles.cardHeader}>
          {title && <div className={styles.cardTitle}>{title}</div>}
          {action && <div className={styles.cardAction}>{action}</div>}
        </div>
      )}
      <div style={{ padding: typeof padding === 'number' ? `${padding}px` : padding }}>
        {children}
      </div>
    </div>
  );
}
