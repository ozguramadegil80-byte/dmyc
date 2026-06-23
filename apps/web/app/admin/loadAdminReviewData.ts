import { fetchAdminVehicleSpecs, fetchReviewDecisions, fetchReviewEvidence } from '../../src/lib/adminReviewApi';

export async function loadAdminReviewData(market = 'TR') {
  const [vehicleSpecs, evidence, decisions] = await Promise.all([
    fetchAdminVehicleSpecs(undefined, market),
    fetchReviewEvidence(),
    fetchReviewDecisions(),
  ]);

  return {
    decisions,
    evidence,
    vehicleSpecs,
  };
}
