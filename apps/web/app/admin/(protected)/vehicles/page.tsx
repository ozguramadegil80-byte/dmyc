import { getAdminSession } from '../../../../src/lib/adminSession';
import { AdminReviewConsole } from '../../../../src/components/AdminReviewConsole';
import { loadAdminReviewData } from '../../loadAdminReviewData';

export default async function VehiclesAdminPage() {
  const session = await getAdminSession();
  const marketCode = session?.marketCode ?? 'TR';
  const contentLocale = session?.contentLocale ?? 'tr';
  const { vehicleSpecs, evidence, decisions, apiError } = await loadAdminReviewData(marketCode);

  return (
    <AdminReviewConsole
      initialVehicleSpecs={vehicleSpecs}
      initialEvidence={evidence}
      initialDecisions={decisions}
      initialView="vehicles"
      initialMarket={marketCode}
      contentLocale={contentLocale}
      adminUsername={session?.username ?? 'admin'}
      apiError={apiError}
    />
  );
}
