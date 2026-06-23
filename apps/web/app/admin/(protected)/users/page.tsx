import { AdminUsersConsole } from '../../../../src/components/AdminUsersConsole';
import { fetchAdminUsers } from '../../../../src/lib/adminReviewApi';

export default async function UsersAdminPage() {
  const users = await fetchAdminUsers();

  return <AdminUsersConsole initialUsers={users} />;
}
