import { AdminSponsorConsole } from '../../../../src/components/AdminSponsorConsole';
import { fetchAdminSponsor } from '../../../../src/lib/adminReviewApi';

export default async function SponsorAdminPage() {
  let initial = null;
  try {
    initial = await fetchAdminSponsor();
  } catch {
    // API erişilemez durumdaysa boş formla açılır
  }
  return <AdminSponsorConsole initial={initial} />;
}
