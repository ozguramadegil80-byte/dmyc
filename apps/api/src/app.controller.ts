import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminReviewService } from './admin-review.service';
import { AnnualReportService } from './annual-report.service';
import { BatteryLifecycleService } from './battery-lifecycle.service';
import { MonthlyReportService } from './monthly-report.service';
import { ChargingIntelligenceService } from './charging-intelligence.service';
import { DriverIntelligenceService } from './driver-intelligence.service';
import { PushNotificationService } from './push-notification.service';
import { ElectricityTariffService } from './electricity-tariff.service';
import { EvAssessmentService } from './ev-assessment.service';
import { ChargingService } from './charging.service';
import { ChargeStopPoiService } from './charge-stop-poi.service';
import { CommunityBenchmarkService } from './community-benchmark.service';
import { GoogleMapsService } from './google-maps.service';
import { InsightStudioService } from './insight-studio.service';
import { PremiumVehicleReportService } from './premium-vehicle-report.service';
import { PremiumAccessService } from './premium-access.service';
import { PremiumGuidanceService } from './premium-guidance.service';
import { RouteFingerprintService } from './route-fingerprint.service';
import { RouteGeometryService } from './route-geometry.service';
import { RoutePlanningService } from './route-planning.service';
import { SavedLocationsService } from './saved-locations.service';
import { ServiceVisitService } from './service-visit.service';
import { TripContextService } from './trip-context.service';
import { TripsService } from './trips.service';
import { TripBehaviorService } from './trip-behavior.service';
import { WeatherService } from './weather.service';
import { TripRecapService } from './trip-recap.service';
import { VehicleRegistryService } from './vehicle-registry.service';
import { VehicleSpecsService } from './vehicle-specs.service';
import { VehiclesService } from './vehicles.service';

@Controller()
export class AppController {
  constructor(
    private readonly adminReview: AdminReviewService,
    private readonly annualReports: AnnualReportService,
    private readonly batteryLifecycle: BatteryLifecycleService,
    private readonly monthlyReports: MonthlyReportService,
    private readonly chargingIntelligence: ChargingIntelligenceService,
    private readonly driverIntelligence: DriverIntelligenceService,
    private readonly pushNotification: PushNotificationService,
    private readonly electricityTariff: ElectricityTariffService,
    private readonly evAssessment: EvAssessmentService,
    private readonly charging: ChargingService,
    private readonly chargeStopPois: ChargeStopPoiService,
    private readonly communityBenchmarks: CommunityBenchmarkService,
    private readonly googleMaps: GoogleMapsService,
    private readonly insightStudio: InsightStudioService,
    private readonly premiumVehicleReport: PremiumVehicleReportService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly premiumGuidance: PremiumGuidanceService,
    private readonly routeFingerprints: RouteFingerprintService,
    private readonly tripBehavior: TripBehaviorService,
    private readonly weather: WeatherService,
    private readonly routeGeometry: RouteGeometryService,
    private readonly routePlanning: RoutePlanningService,
    private readonly savedLocations: SavedLocationsService,
    private readonly serviceVisit: ServiceVisitService,
    private readonly tripContext: TripContextService,
    private readonly trips: TripsService,
    private readonly tripRecaps: TripRecapService,
    private readonly vehicleRegistry: VehicleRegistryService,
    private readonly vehicleSpecs: VehicleSpecsService,
    private readonly vehicles: VehiclesService,
  ) {}

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'dmyc-api',
    };
  }

  @Get('vehicle-specs')
  listVehicleSpecs(@Query('q') q?: string, @Query('market') market?: string) {
    return this.vehicleSpecs.list(q, market);
  }

  @Get('vehicle-specs/search')
  searchVehicleSpecs(@Query('q') q?: string, @Query('market') market?: string) {
    return this.vehicleSpecs.list(q, market);
  }

  @Get('maps/places/autocomplete')
  autocompletePlaces(
    @Query('input') input?: string,
    @Query('language') language?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    return this.googleMaps.autocomplete(input, language, latitude, longitude);
  }

  @Get('maps/places/details')
  placeDetails(@Query('placeId') placeId?: string, @Query('language') language?: string) {
    return this.googleMaps.placeDetails(placeId, language);
  }

  @Get('maps/places/nearby-ev')
  nearbyEvStations(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('language') language?: string,
  ) {
    return this.googleMaps.searchEvChargingStations(Number(latitude), Number(longitude), language);
  }

  @Post('maps/route-preview')
  previewRoute(@Body() body: Parameters<GoogleMapsService['routePreview']>[0]) {
    return this.googleMaps.routePreview(body);
  }

  @Get('admin/users')
  @UseGuards(AdminApiKeyGuard)
  listAdminUsers() {
    return this.vehicles.listAdminUsers();
  }

  @Post('admin/users')
  @UseGuards(AdminApiKeyGuard)
  createAdminUser(@Body() body: Parameters<VehiclesService['createAdminUser']>[0]) {
    return this.vehicles.createAdminUser(body);
  }

  @Patch('admin/users/:id')
  @UseGuards(AdminApiKeyGuard)
  updateAdminUser(
    @Param('id') id: string,
    @Body() body: Parameters<VehiclesService['updateAdminUser']>[1],
  ) {
    return this.vehicles.updateAdminUser(id, body);
  }

  @Delete('admin/users/:id')
  @UseGuards(AdminApiKeyGuard)
  deleteAdminUser(@Param('id') id: string) {
    return this.vehicles.deleteAdminUser(id);
  }

  @Get('admin/vehicle-review/evidence')
  @UseGuards(AdminApiKeyGuard)
  listVehicleReviewEvidence(@Query('status') status?: string) {
    return this.adminReview.listEvidence(status);
  }

  @Get('admin/vehicle-review/specs')
  @UseGuards(AdminApiKeyGuard)
  listAdminVehicleSpecs(@Query('q') q?: string, @Query('market') market?: string) {
    return this.adminReview.listVehicleSpecs(q, market);
  }

  @Get('admin/vehicle-brand-assets')
  @UseGuards(AdminApiKeyGuard)
  listVehicleBrandAssets() {
    return this.adminReview.listVehicleBrandAssets();
  }

  @Patch('admin/vehicle-brand-assets/:brand')
  @UseGuards(AdminApiKeyGuard)
  updateVehicleBrandAsset(
    @Param('brand') brand: string,
    @Body() body: Parameters<AdminReviewService['updateVehicleBrandAsset']>[1],
  ) {
    return this.adminReview.updateVehicleBrandAsset(brand, body);
  }

  @Patch('admin/vehicle-review/specs/:id')
  @UseGuards(AdminApiKeyGuard)
  updateAdminVehicleSpec(
    @Param('id') id: string,
    @Body() body: Parameters<AdminReviewService['updateVehicleSpec']>[1],
  ) {
    return this.adminReview.updateVehicleSpec(id, body);
  }

  @Get('admin/vehicle-review/decisions')
  @UseGuards(AdminApiKeyGuard)
  listVehicleReviewDecisions(@Query('status') status?: string) {
    return this.adminReview.listDecisions(status);
  }

  @Patch('admin/vehicle-review/evidence/:id')
  @UseGuards(AdminApiKeyGuard)
  updateVehicleReviewEvidence(
    @Param('id') id: string,
    @Body() body: Parameters<AdminReviewService['updateEvidence']>[1],
  ) {
    return this.adminReview.updateEvidence(id, body);
  }

  @Delete('admin/vehicle-review/evidence/:id')
  @UseGuards(AdminApiKeyGuard)
  deleteVehicleReviewEvidence(@Param('id') id: string) {
    return this.adminReview.deleteEvidence(id);
  }

  @Post('admin/vehicle-review/decisions')
  @UseGuards(AdminApiKeyGuard)
  createVehicleReviewDecision(@Body() body: Parameters<AdminReviewService['createDecision']>[0]) {
    return this.adminReview.createDecision(body);
  }

  // ── Insight Studio / B2B ─────────────────────────────────────────────────

  @Post('admin/insight-queries')
  @UseGuards(AdminApiKeyGuard)
  createInsightQuery(
    @Body() body: Parameters<InsightStudioService['saveQuery']>[0],
  ) {
    return this.insightStudio.saveQuery(body);
  }

  @Get('admin/insight-queries')
  @UseGuards(AdminApiKeyGuard)
  listInsightQueries() {
    return this.insightStudio.listQueries();
  }

  @Get('admin/ad-segments')
  @UseGuards(AdminApiKeyGuard)
  listAdSegments() {
    return this.insightStudio.listSegments();
  }

  @Post('admin/ad-segments')
  @UseGuards(AdminApiKeyGuard)
  createAdSegment(
    @Body() body: Parameters<InsightStudioService['createSegment']>[0],
  ) {
    return this.insightStudio.createSegment(body);
  }

  @Post('admin/ad-segments/:key/refresh')
  @UseGuards(AdminApiKeyGuard)
  refreshAdSegment(@Param('key') key: string) {
    return this.insightStudio.refreshSegment(key);
  }

  @Post('admin/ad-segments/seed-defaults')
  @UseGuards(AdminApiKeyGuard)
  seedDefaultSegments() {
    return this.insightStudio.seedDefaultSegments();
  }

  @Patch('admin/vehicle-review/decisions/:id')
  @UseGuards(AdminApiKeyGuard)
  updateVehicleReviewDecision(
    @Param('id') id: string,
    @Body() body: Parameters<AdminReviewService['updateDecision']>[1],
  ) {
    return this.adminReview.updateDecision(id, body);
  }

  @Delete('admin/vehicle-review/decisions/:id')
  @UseGuards(AdminApiKeyGuard)
  deleteVehicleReviewDecision(@Param('id') id: string) {
    return this.adminReview.deleteDecision(id);
  }

  @Post('users')
  createUser(@Body() body: Parameters<VehiclesService['createUser']>[0]) {
    return this.vehicles.createUser(body);
  }

  @Post('users/login')
  loginUser(@Body() body: Parameters<VehiclesService['loginUser']>[0]) {
    return this.vehicles.loginUser(body);
  }

  @Get('users/:id/active-binding')
  getActiveBindingForUser(@Param('id') id: string) {
    return this.vehicles.getActiveBindingForUser(id);
  }

  @Get('users/:id/vehicles')
  getActiveVehiclesForUser(@Param('id') id: string) {
    return this.vehicles.getActiveVehiclesForUser(id);
  }

  @Get('users/:id/vehicle-context')
  getCurrentVehicleContext(@Param('id') id: string) {
    return this.vehicles.getCurrentVehicleContext(id);
  }

  @Get('users/:id/premium-access')
  getPremiumAccess(@Param('id') id: string) {
    return this.premiumAccess.getAccess(id);
  }

  @Get('users/:id/saved-locations')
  listSavedLocations(@Param('id') id: string) {
    return this.savedLocations.listLocations(id);
  }

  @Post('users/:id/saved-locations')
  createSavedLocation(
    @Param('id') id: string,
    @Body() body: Parameters<SavedLocationsService['createLocation']>[1],
  ) {
    return this.savedLocations.createLocation(id, body);
  }

  @Get('users/:id/saved-routes')
  listSavedRoutes(@Param('id') id: string) {
    return this.savedLocations.listRoutes(id);
  }

  @Patch('users/:id/saved-locations/:locationId')
  updateSavedLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() body: Parameters<SavedLocationsService['updateLocation']>[2],
  ) {
    return this.savedLocations.updateLocation(id, locationId, body);
  }

  @Delete('users/:id/saved-locations/:locationId')
  deleteSavedLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    return this.savedLocations.deleteLocation(id, locationId);
  }

  @Post('users/:id/saved-routes')
  createSavedRoute(
    @Param('id') id: string,
    @Body() body: Parameters<SavedLocationsService['createRoute']>[1],
  ) {
    return this.savedLocations.createRoute(id, body);
  }

  @Delete('users/:id/saved-routes/:routeId')
  deleteSavedRoute(
    @Param('id') id: string,
    @Param('routeId') routeId: string,
  ) {
    return this.savedLocations.deleteRoute(id, routeId);
  }

  @Post('vehicles')
  createVehicle(@Body() body: Parameters<VehiclesService['createVehicle']>[0]) {
    return this.vehicles.createVehicle(body);
  }

  @Post('vehicle-ownerships')
  createOwnership(@Body() body: Parameters<VehiclesService['createOwnership']>[0]) {
    return this.vehicles.createOwnership(body);
  }

  @Post('usage-signals')
  createUsageSignal(@Body() body: Parameters<VehiclesService['createUsageSignal']>[0]) {
    return this.vehicles.createUsageSignal(body);
  }

  @Post('charge-sessions')
  createChargeSession(@Body() body: Parameters<ChargingService['createChargeSession']>[0]) {
    return this.charging.createChargeSession(body);
  }

  @Post('charge-evidence')
  createChargeEvidence(@Body() body: Parameters<ChargingService['createChargeEvidence']>[0]) {
    return this.charging.createChargeEvidence(body);
  }

  @Post('charging-decision-events')
  async createChargingDecisionEvent(
    @Body() body: Parameters<ChargingService['createChargingDecisionEvent']>[0],
  ) {
    const event = await this.charging.createChargingDecisionEvent(body);
    if (event?.vehicleId) {
      void this.chargingIntelligence.refreshNeedClustersForVehicle(event.vehicleId).catch(() => {});
    }
    return event;
  }

  @Post('trips')
  createTrip(@Body() body: Parameters<TripsService['createTrip']>[0]) {
    return this.trips.createTrip(body);
  }

  @Post('trips/:id/points')
  appendTripPoints(
    @Param('id') id: string,
    @Body() body: Parameters<TripsService['appendTripPoints']>[1],
  ) {
    return this.trips.appendTripPoints(id, body);
  }

  @Post('trips/:id/finish')
  finishTrip(@Param('id') id: string, @Body() body: Parameters<TripsService['finishTrip']>[1]) {
    return this.trips.finishTrip(id, body);
  }

  @Get('trips/:id/route-progress')
  getTripRouteProgress(@Param('id') id: string) {
    return this.trips.getRouteProgress(id);
  }

  @Get('trips/:id/behavior')
  getTripBehavior(@Param('id') id: string) {
    return this.tripBehavior.getTripBehaviorSummary(id);
  }

  @Patch('trips/:id/hvac-confirmation')
  confirmTripHvac(@Param('id') id: string, @Body() body: { confirmed: boolean }) {
    return this.weather.confirmHvac(id, body.confirmed);
  }

  @Get('users/:userId/driver-profile/:vehicleId')
  getDriverProfile(@Param('userId') userId: string, @Param('vehicleId') vehicleId: string) {
    return this.tripBehavior.getDriverProfile(userId, vehicleId);
  }

  @Post('users/:userId/push-token')
  savePushToken(@Param('userId') userId: string, @Body() body: { token: string }) {
    return this.pushNotification.savePushToken(userId, body.token);
  }

  @Get('route-fingerprints/:id/behavior')
  getRouteBehavior(@Param('id') id: string) {
    return this.tripBehavior.getRouteBehaviorSummary(id);
  }

  @Post('trips/:id/recap')
  createTripRecap(@Param('id') id: string) {
    return this.tripRecaps.createRecap(id);
  }

  @Get('trips/:id/recap')
  getTripRecap(@Param('id') id: string) {
    return this.tripRecaps.getRecapByTrip(id);
  }

  @Get('trips/:id/context-questions')
  getTripContextQuestions(@Param('id') id: string) {
    return this.tripContext.getQuestionsForTrip(id);
  }

  @Post('trips/:id/context-answers')
  async recordTripContextAnswer(
    @Param('id') id: string,
    @Body() body: { questionType: string; answer: string },
  ) {
    const result = await this.tripContext.recordAnswer(id, body);
    if (body.questionType === 'SERVICE_VISIT' && body.answer !== 'hayir') {
      await this.serviceVisit.createVisitFromTripQuestion(id);
    }
    return result;
  }

  @Get('trips/:id/context')
  getTripContext(@Param('id') id: string) {
    return this.tripContext.getContextForTrip(id);
  }

  @Post('trips/:id/live-guidance')
  createLiveTripGuidance(@Param('id') id: string) {
    return this.premiumGuidance.createLiveTripGuidance(id);
  }

  @Post('trip-recaps/:id/share-cards')
  createTripShareCard(
    @Param('id') id: string,
    @Body() body: Parameters<TripRecapService['createShareCard']>[1],
  ) {
    return this.tripRecaps.createShareCard(id, body);
  }

  @Get('trip-share-cards/:token')
  getTripShareCard(@Param('token') token: string) {
    return this.tripRecaps.getShareCard(token);
  }

  @Get('vehicles/:id/usage-profile')
  getUsageProfile(@Param('id') id: string) {
    return this.vehicles.getUsageProfile(id);
  }

  @Get('vehicles/:id/charge-summary')
  getChargeSummary(@Param('id') id: string) {
    return this.charging.getChargeSummary(id);
  }

  @Get('vehicles/:id/trips')
  listVehicleTrips(@Param('id') id: string) {
    return this.trips.listVehicleTrips(id);
  }

  @Get('vehicles/:id/trip-summary')
  getTripSummary(@Param('id') id: string) {
    return this.trips.getTripSummary(id);
  }

  @Get('vehicles/:id/route-fingerprints/match-origin')
  matchRouteOrigin(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.routeFingerprints.matchOrigin(id, parseFloat(lat), parseFloat(lng));
  }

  @Get('vehicles/:id/route-fingerprints')
  listVehicleRouteFingerprints(@Param('id') id: string) {
    return this.routeFingerprints.listVehicleRouteFingerprints(id);
  }

  @Get('vehicles/:id/route-summary')
  getRouteSummary(@Param('id') id: string) {
    return this.routeFingerprints.getVehicleRouteSummary(id);
  }

  @Get('vehicles/:id/driver-intelligence')
  getDriverIntelligence(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.driverIntelligence.getIntelligence(userId ?? '', id);
  }

  @Post('vehicles/:id/route-plans')
  createRoutePlan(
    @Param('id') id: string,
    @Body() body: Parameters<RoutePlanningService['createPlan']>[1],
  ) {
    return this.routePlanning.createPlan(id, body);
  }

  @Get('vehicles/:id/route-plans/latest')
  getLatestRoutePlan(@Param('id') id: string) {
    return this.routePlanning.getLatestPlan(id);
  }

  @Post('route-plans/:id/route-geometry')
  createRouteGeometry(@Param('id') id: string, @Body() body: Parameters<RouteGeometryService['createSnapshot']>[1]) {
    return this.routeGeometry.createSnapshot(id, body);
  }

  @Get('route-plans/:id/route-geometry/latest')
  getLatestRouteGeometry(@Param('id') id: string) {
    return this.routeGeometry.getLatestSnapshot(id);
  }

  @Post('route-plans/:id/charge-stop-poi-candidates')
  createChargeStopPoiCandidates(@Param('id') id: string) {
    return this.chargeStopPois.createCandidates(id);
  }

  @Get('route-plans/:id/charge-stop-poi-candidates')
  listChargeStopPoiCandidates(@Param('id') id: string) {
    return this.chargeStopPois.listCandidates(id);
  }

  @Post('route-plans/:id/premium-guidance')
  createPremiumGuidance(@Param('id') id: string) {
    return this.premiumGuidance.createGuidance(id);
  }

  @Post('route-plans/:id/mock-guidance')
  createMockGuidance(
    @Param('id') id: string,
    @Body() body: Parameters<PremiumGuidanceService['createMockGuidance']>[1],
  ) {
    return this.premiumGuidance.createMockGuidance(id, body);
  }

  @Get('vehicles/:id/trip-advisories/latest')
  getLatestTripAdvisories(@Param('id') id: string) {
    return this.premiumGuidance.getLatestVehicleAdvisories(id);
  }

  @Get('vehicles/:id/community-benchmark')
  getCommunityBenchmark(@Param('id') id: string) {
    return this.communityBenchmarks.getVehicleCommunityBenchmark(id);
  }

  @Get('vehicles/:id/battery-lifecycle')
  getBatteryLifecycle(@Param('id') id: string) {
    return this.batteryLifecycle.getByVehicle(id);
  }

  @Get('vehicles/:id/monthly-report/latest')
  getLatestMonthlyReport(@Param('id') id: string) {
    return this.monthlyReports.getLatestForVehicle(id);
  }

  @Get('vehicles/:id/annual-report/latest')
  getLatestAnnualReport(@Param('id') id: string) {
    return this.annualReports.getLatestForVehicle(id);
  }

  @Get('vehicles/:id/first-card')
  getFirstCard(@Param('id') id: string) {
    return this.vehicles.getFirstCard(id);
  }

  // ── Araç Sicili ──────────────────────────────────────────────────────────

  @Get('vehicles/:id/registry')
  getRegistrySummary(@Param('id') id: string) {
    return this.vehicleRegistry.getRegistrySummary(id);
  }

  @Get('vehicles/:id/state-snapshots')
  listStateSnapshots(@Param('id') id: string) {
    return this.vehicleRegistry.listStateSnapshots(id);
  }

  @Post('vehicles/:id/state-snapshots')
  createStateSnapshot(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['createStateSnapshot']>[0],
  ) {
    return this.vehicleRegistry.createStateSnapshot({ ...body, vehicleId: id });
  }

  // ── Vehicle access (rol/izin) ─────────────────────────────────────────────

  @Get('vehicles/:vehicleId/access/me')
  getMyVehicleAccess(
    @Param('vehicleId') vehicleId: string,
    @Query('userId') userId: string,
  ) {
    return this.vehicles.getMyVehicleAccess(userId, vehicleId);
  }

  @Get('vehicles/:vehicleId/access')
  listVehicleAccess(
    @Param('vehicleId') vehicleId: string,
    @Query('userId') userId: string,
  ) {
    return this.vehicles.listVehicleAccess(userId, vehicleId);
  }

  @Post('vehicles/:vehicleId/access/:accessId/revoke')
  revokeVehicleAccess(
    @Param('vehicleId') vehicleId: string,
    @Param('accessId') accessId: string,
    @Query('userId') userId: string,
  ) {
    return this.vehicles.revokeVehicleAccess(userId, vehicleId, accessId);
  }

  // ── Vehicle access invites ────────────────────────────────────────────────

  @Post('vehicles/:vehicleId/invites')
  createVehicleInvite(
    @Param('vehicleId') vehicleId: string,
    @Query('userId') userId: string,
    @Body() body: { identifier: string; role?: string; permissions?: string[] },
  ) {
    return this.vehicles.createVehicleInvite(userId, vehicleId, body);
  }

  @Post('vehicle-invites/:token/accept')
  acceptVehicleInvite(
    @Param('token') token: string,
    @Body() body: { userId: string },
  ) {
    return this.vehicles.acceptVehicleInvite(token, body.userId);
  }

  // ── Legacy vehicle drivers (vehicle_drivers tablosu — sonra deprecate edilecek) ──

  @Get('vehicles/:id/drivers')
  listDrivers(@Param('id') id: string) {
    return this.vehicleRegistry.listDrivers(id);
  }

  @Post('vehicles/:id/drivers')
  addDriver(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['addDriver']>[1],
  ) {
    return this.vehicleRegistry.addDriver(id, body);
  }

  @Get('vehicles/:id/transfer-requests')
  listTransferRequests(@Param('id') id: string) {
    return this.vehicleRegistry.listTransferRequests(id);
  }

  @Post('vehicles/:id/transfer-requests')
  createTransferRequest(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['createTransferRequest']>[1],
  ) {
    return this.vehicleRegistry.createTransferRequest(id, body);
  }

  @Patch('transfer-requests/:id')
  resolveTransferRequest(
    @Param('id') id: string,
    @Body() body: { status: 'accepted' | 'cancelled' },
  ) {
    return this.vehicleRegistry.resolveTransferRequest(id, body.status);
  }

  @Post('vehicles/:id/public-report')
  generatePublicReport(@Param('id') id: string) {
    return this.vehicleRegistry.generatePublicReport(id);
  }

  @Get('vehicles/:id/public-report')
  getPublicReport(@Param('id') id: string) {
    return this.vehicleRegistry.getPublicReport(id);
  }

  @Get('public/vehicles/:token')
  getPublicVehicleReport(@Param('token') token: string) {
    return this.vehicleRegistry.getPublicReportByToken(token);
  }

  // ── EPDK Elektrik Tarifeleri ─────────────────────────────────────────────

  @Get('tariff-periods')
  listTariffPeriods(
    @Query('marketCode') marketCode?: string,
    @Query('subscriberType') subscriberType?: string,
  ) {
    return this.electricityTariff.listPeriods(marketCode, subscriberType);
  }

  @Get('tariff-periods/active')
  getActiveTariff(
    @Query('marketCode') marketCode?: string,
    @Query('subscriberType') subscriberType?: string,
  ) {
    return this.electricityTariff.getActiveTariff(subscriberType, marketCode);
  }

  @Post('admin/tariff-periods')
  @UseGuards(AdminApiKeyGuard)
  addTariffPeriod(@Body() body: Parameters<ElectricityTariffService['addTariffPeriod']>[0]) {
    return this.electricityTariff.addTariffPeriod(body);
  }

  @Post('tariff-costs/estimate')
  estimateTariffCosts(@Body() body: Parameters<ElectricityTariffService['calculateCostModes']>[0]) {
    return this.electricityTariff.calculateCostModes(body);
  }

  // ── Şarj Davranış Kümeleme ───────────────────────────────────────────────

  @Get('vehicles/:id/charging-behavior')
  getChargingBehavior(@Param('id') id: string) {
    return this.chargingIntelligence.getBehaviorSummary(id);
  }

  @Get('charging-demand-hotspots')
  @UseGuards(AdminApiKeyGuard)
  async listChargingDemandHotspots() {
    await this.chargingIntelligence.refreshDemandHotspots();
    return this.chargingIntelligence.listDemandHotspots();
  }

  // ── Servis / Bakım ───────────────────────────────────────────────────────

  @Post('service-visits')
  createServiceVisit(
    @Body() body: { vehicleId: string; userId?: string } & Parameters<ServiceVisitService['createVisit']>[1],
  ) {
    return this.serviceVisit.createVisit(body.vehicleId, body, body.userId);
  }

  @Get('vehicles/:id/service-visits')
  listServiceVisits(@Param('id') id: string) {
    return this.serviceVisit.listForVehicle(id);
  }

  @Post('service-visits/:id/evidence')
  addServiceEvidence(
    @Param('id') id: string,
    @Body() body: Parameters<ServiceVisitService['addEvidence']>[1],
  ) {
    return this.serviceVisit.addEvidence(id, body);
  }

  @Get('vehicles/:id/service-compliance')
  getServiceCompliance(@Param('id') id: string) {
    return this.serviceVisit.calculateComplianceRate(id);
  }

  @Post('vehicles/:id/assessment')
  createVehicleAssessment(
    @Param('id') id: string,
    @Body() body: { odometerKm: number; purchaseYear?: number; city?: string; ownershipId?: string; usageType?: string },
  ) {
    return this.evAssessment.createAssessment(id, body.ownershipId ?? null, {
      odometerKm: body.odometerKm,
      purchaseYear: body.purchaseYear ?? null,
      city: body.city ?? null,
      usageType: body.usageType ?? null,
    });
  }

  @Get('vehicles/:id/assessment/latest')
  getLatestAssessment(@Param('id') id: string, @Query('language') language?: string) {
    return this.evAssessment.getLatestAssessment(id, language);
  }

  @Post('vehicles/:id/premium-report')
  createPremiumReport(
    @Param('id') id: string,
    @Body() body: { ownershipId?: string },
  ) {
    return this.premiumVehicleReport.createReport(id, body.ownershipId ?? null);
  }

  @Get('vehicles/:id/premium-report/latest')
  getLatestPremiumReport(@Param('id') id: string) {
    return this.premiumVehicleReport.getLatestReport(id);
  }

  @Get('vehicles/:id/premium-report/preview')
  previewPremiumReport(@Param('id') id: string) {
    return this.premiumVehicleReport.buildReport(id);
  }

  @Post('vehicles/:id/external-battery-reports')
  addExternalBatteryReport(
    @Param('id') id: string,
    @Body() body: {
      provider: string;
      reportType?: string;
      reportUrl?: string;
      reportDate?: string;
      sohPercent?: number;
      sourceType?: string;
      notes?: string;
      ownershipId?: string;
    },
  ) {
    return this.premiumVehicleReport.addExternalReport(id, body);
  }

  @Get('vehicles/:id/external-battery-reports')
  getExternalBatteryReports(@Param('id') id: string) {
    return this.premiumVehicleReport.fetchExternalReports(id);
  }
}
