import { fetchAdminVehicleSpecs, fetchReviewDecisions, fetchReviewEvidence } from '../../src/lib/adminReviewApi';

export async function loadAdminReviewData(market = 'TR') {
  try {
    const [vehicleSpecs, evidence, decisions] = await Promise.all([
      fetchAdminVehicleSpecs(undefined, market),
      fetchReviewEvidence(),
      fetchReviewDecisions(),
    ]);
    return { decisions, evidence, vehicleSpecs, apiError: false };
  } catch {
    return { decisions: [], evidence: [], vehicleSpecs: [], apiError: true };
  }
}
