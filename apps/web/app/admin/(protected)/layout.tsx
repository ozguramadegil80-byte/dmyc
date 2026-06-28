import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../src/lib/adminSession';
import { AdminShell } from '../../../src/components/admin/AdminShell';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <AdminShell username={session.username}>
      {children}
    </AdminShell>
  );
}
