import { AdminUsersConsole } from '../../../../src/components/AdminUsersConsole';
import { fetchAdminUsers } from '../../../../src/lib/adminReviewApi';
import { getAdminProfile } from '../../../../src/lib/adminProfileStore';
import { getAdminSession } from '../../../../src/lib/adminSession';

export default async function UsersAdminPage() {
  const [users, session, adminProfile] = await Promise.all([
    fetchAdminUsers(),
    getAdminSession(),
    getAdminProfile(),
  ]);

  return <AdminUsersConsole adminProfile={adminProfile} adminUsername={session?.username ?? 'admin'} initialUsers={users} />;
}
