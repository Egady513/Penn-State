import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin — Drive Out Hunger 2026',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
