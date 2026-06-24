'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import styles from './AdminShell.module.css';

const NAV_ITEMS = [
  { href: '/admin',              label: 'Overview',         icon: 'home'      as const },
  { href: '/admin/registrations', label: 'Teams',           icon: 'users'     as const },
  { href: '/admin/foursomes',    label: 'Foursome builder',  icon: 'grid'      as const },
  { href: '/admin/sponsors',     label: 'Sponsors',          icon: 'tag'       as const },
  { href: '/admin/donors',       label: 'Donors',            icon: 'tag'       as const },
  { href: '/admin/catalog',      label: 'Catalog',           icon: 'dollar'    as const },
  { href: '/admin/course',       label: 'Course setup',      icon: 'flag'      as const },
  { href: '/admin/schedule',     label: 'Schedule',          icon: 'clock'     as const },
  { href: '/admin/included',     label: "What's included",   icon: 'check'     as const },
  { href: '/admin/checkin',      label: 'Check-in',          icon: 'qr'        as const },
  { href: '/admin/announcements',label: 'Announcements',     icon: 'megaphone' as const },
] satisfies { href: string; label: string; icon: Parameters<typeof Icon>[0]['name'] }[];

// Mobile tab bar shows only the 5 most-used items
const MOBILE_TABS = [
  NAV_ITEMS[0], // Overview
  NAV_ITEMS[1], // Teams
  NAV_ITEMS[8], // Check-in
  NAV_ITEMS[9], // Announcements
  NAV_ITEMS[2], // Foursomes
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className={styles.shell}>
      {/* Sidebar (desktop ≥1024px) */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          {/* Logo placeholder — replace with next/image when logo asset is in place */}
          <div className={styles.logoMark}>
            <span className={styles.logoText}>PSU</span>
            <span className={styles.logoDot} />
          </div>
          <div className={styles.eventLabel}>Drive Out Hunger 2026</div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const on = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${on ? styles.navItemActive : ''}`}
              >
                {on && <span className={styles.activeRail} aria-hidden />}
                <Icon
                  name={item.icon}
                  size={18}
                  color={on ? 'var(--psu-pugh)' : 'rgba(255,255,255,0.55)'}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatarCircle}>EG</div>
          <div className={styles.footerMeta}>
            <div className={styles.footerName}>Eddie Gady</div>
            <div className={styles.footerRole}>Chapter president</div>
          </div>
          <Link href="/admin/login" className={styles.logoutBtn} title="Sign out">
            <Icon name="logout" size={16} color="rgba(255,255,255,0.5)" />
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Mobile top bar */}
        <div className={styles.mobileTopBar}>
          <div className={styles.mobileBrand}>Admin</div>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
        </div>

        {/* Mobile drawer overlay */}
        {mobileMenuOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav
              className={styles.mobileDrawer}
              onClick={(e) => e.stopPropagation()}
            >
              {NAV_ITEMS.map((item) => {
                const on = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.drawerItem} ${on ? styles.drawerItemActive : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      color={on ? 'var(--psu-pugh)' : 'rgba(255,255,255,0.6)'}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <div className={styles.pageContent}>{children}</div>

        {/* Mobile bottom tab bar */}
        <nav className={styles.mobileTabBar}>
          {MOBILE_TABS.map((item) => {
            const on = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileTab} ${on ? styles.mobileTabActive : ''}`}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={on ? 'var(--psu-pugh)' : 'rgba(255,255,255,0.5)'}
                />
                <span className={styles.mobileTabLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
