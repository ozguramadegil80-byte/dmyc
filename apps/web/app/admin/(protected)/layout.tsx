import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '../../../src/lib/adminSession';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminSession())) {
    redirect('/admin/login');
  }

  return (
    <div className="admin-root">
      <nav className="admin-main-nav">
        <div className="admin-main-nav-inner">
          <span className="admin-main-brand">DMyC Admin</span>
          <Link href="/admin/vehicles">Araçlar</Link>
          <Link href="/admin/review">İnceleme</Link>
          <Link href="/admin/users">Kullanıcılar</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
