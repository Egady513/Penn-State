import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_CATALOG } from '@/lib/mockData';
import styles from './page.module.css';

type CatalogItem = {
  id: string;
  label: string;
  price: number;
  desc: string;
  perPerson?: boolean;
};

function CatalogSection({
  title,
  sub,
  items,
}: {
  title: string;
  sub: string;
  items: CatalogItem[];
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionSub}>{sub}</span>
      </div>
      <div className={styles.cardGrid}>
        {items.map((item) => (
          <div key={item.id} className={styles.itemCard}>
            <div className={styles.itemTop}>
              <div className={styles.itemLabel}>{item.label}</div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
            <div className={styles.itemDesc}>{item.desc}</div>
            <div className={styles.itemPrice}>
              ${item.price}
              {item.perPerson && (
                <span className={styles.perGolfer}> / golfer</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <div>
      <AdminTopBar
        title="Catalog & pricing"
        action={
          <Button variant="primary" size="sm">
            <Icon name="plus" size={14} />
            Add item
          </Button>
        }
      />

      <div className={styles.page}>
        <CatalogSection
          title="Base"
          sub="Required at registration"
          items={[ADMIN_CATALOG.base]}
        />
        <CatalogSection
          title="Team add-ons"
          sub="Purchased once per team"
          items={ADMIN_CATALOG.team}
        />
        <CatalogSection
          title="Per-person add-ons"
          sub="Purchased per golfer"
          items={ADMIN_CATALOG.person}
        />
      </div>
    </div>
  );
}
