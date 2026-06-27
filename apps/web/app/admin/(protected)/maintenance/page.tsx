import { fetchMaintenanceCandidates, type MaintenanceCandidate } from '../../../../src/lib/adminReviewApi';
import { AdminMaintenanceCandidatesConsole } from '../../../../src/components/AdminMaintenanceCandidatesConsole';

export default async function MaintenanceCandidatesAdminPage() {
  let initialCandidates: MaintenanceCandidate[] = [];
  try {
    initialCandidates = await fetchMaintenanceCandidates('pending');
  } catch {
    initialCandidates = [];
  }

  return <AdminMaintenanceCandidatesConsole initialCandidates={initialCandidates} />;
}
