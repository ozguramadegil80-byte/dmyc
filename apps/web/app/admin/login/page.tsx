import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../src/lib/adminSession';
import { AdminLoginForm } from './AdminLoginForm';

export default async function AdminLoginPage() {
  if (await getAdminSession()) {
    redirect('/admin/vehicles');
  }
  return <AdminLoginForm />;
}
