import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { JwtAuthGuard, type JwtUser } from './jwt-auth.guard';
import { VehicleAccessGuard } from './vehicle-access.guard';
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
import { SponsorService } from './sponsor.service';
import { AracSiciliService, InspectionUpsertBody, ServiceEventBody } from './arac-sicili.service';

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
    private readonly sponsor: SponsorService,
    private readonly aracSicili: AracSiciliService,
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

  @Get('admin/profile')
  @UseGuards(AdminApiKeyGuard)
  getAdminProfile() {
    return this.vehicles.getAdminProfile();
  }

  @Patch('admin/profile')
  @UseGuards(AdminApiKeyGuard)
  updateAdminProfile(@Body() body: Parameters<VehiclesService['updateAdminProfile']>[0]) {
    return this.vehicles.updateAdminProfile(body);
  }

  @Post('admin/profile/verify')
  @UseGuards(AdminApiKeyGuard)
  verifyAdminProfile(@Body() body: Parameters<VehiclesService['verifyAdminProfileCredentials']>[0]) {
    return this.vehicles.verifyAdminProfileCredentials(body);
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

  @Post('admin/vehicle-review/evidence/approve-batch')
  @UseGuards(AdminApiKeyGuard)
  approveVehicleReviewEvidence(@Body() body: Parameters<AdminReviewService['approveEvidenceBatch']>[0]) {
    return this.adminReview.approveEvidenceBatch(body);
  }

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
  @UseGuards(JwtAuthGuard)
  getActiveBindingForUser(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.vehicles.getActiveBindingForUser(id);
  }

  @Get('users/:id/vehicles')
  @UseGuards(JwtAuthGuard)
  getActiveVehiclesForUser(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.vehicles.getActiveVehiclesForUser(id);
  }

  @Get('users/:id/vehicle-context')
  @UseGuards(JwtAuthGuard)
  getCurrentVehicleContext(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.vehicles.getCurrentVehicleContext(id);
  }

  @Get('users/:id/premium-access')
  @UseGuards(JwtAuthGuard)
  getPremiumAccess(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.premiumAccess.getAccess(id);
  }

  @Get('users/:id/saved-locations')
  @UseGuards(JwtAuthGuard)
  listSavedLocations(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.listLocations(id);
  }

  @Post('users/:id/saved-locations')
  @UseGuards(JwtAuthGuard)
  createSavedLocation(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() body: Parameters<SavedLocationsService['createLocation']>[1],
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.createLocation(id, body);
  }

  @Get('users/:id/saved-routes')
  @UseGuards(JwtAuthGuard)
  listSavedRoutes(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.listRoutes(id);
  }

  @Patch('users/:id/saved-locations/:locationId')
  @UseGuards(JwtAuthGuard)
  updateSavedLocation(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() body: Parameters<SavedLocationsService['updateLocation']>[2],
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.updateLocation(id, locationId, body);
  }

  @Delete('users/:id/saved-locations/:locationId')
  @UseGuards(JwtAuthGuard)
  deleteSavedLocation(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.deleteLocation(id, locationId);
  }

  @Post('users/:id/saved-routes')
  @UseGuards(JwtAuthGuard)
  createSavedRoute(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() body: Parameters<SavedLocationsService['createRoute']>[1],
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.createRoute(id, body);
  }

  @Delete('users/:id/saved-routes/:routeId')
  @UseGuards(JwtAuthGuard)
  deleteSavedRoute(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Param('routeId') routeId: string,
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.savedLocations.deleteRoute(id, routeId);
  }

  @Post('vehicles')
  @UseGuards(JwtAuthGuard)
  createVehicle(@Body() body: Parameters<VehiclesService['createVehicle']>[0]) {
    return this.vehicles.createVehicle(body);
  }

  @Patch('vehicles/:id/vin')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  updateVehicleVin(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() body: { vinLast5?: string },
  ) {
    return this.vehicles.updateVehicleVin(id, req.user.id, body);
  }

  @Post('vehicle-ownerships')
  @UseGuards(JwtAuthGuard)
  createOwnership(
    @Req() req: { user: JwtUser },
    @Body() body: Parameters<VehiclesService['createOwnership']>[0],
  ) {
    return this.vehicles.createOwnership({ ...body, userId: req.user.id });
  }

  @Post('usage-signals')
  @UseGuards(JwtAuthGuard)
  createUsageSignal(
    @Req() req: { user: JwtUser },
    @Body() body: Parameters<VehiclesService['createUsageSignal']>[0],
  ) {
    return this.vehicles.createUsageSignal({ ...body, userId: req.user.id });
  }

  @Post('charge-sessions')
  @UseGuards(JwtAuthGuard)
  createChargeSession(
    @Req() req: { user: JwtUser },
    @Body() body: Parameters<ChargingService['createChargeSession']>[0],
  ) {
    return this.charging.createChargeSession({ ...body, userId: req.user.id });
  }

  @Post('charge-evidence')
  @UseGuards(JwtAuthGuard)
  createChargeEvidence(@Body() body: Parameters<ChargingService['createChargeEvidence']>[0]) {
    return this.charging.createChargeEvidence(body);
  }

  @Post('charging-decision-events')
  @UseGuards(JwtAuthGuard)
  async createChargingDecisionEvent(
    @Req() req: { user: JwtUser },
    @Body() body: Parameters<ChargingService['createChargingDecisionEvent']>[0],
  ) {
    const event = await this.charging.createChargingDecisionEvent({ ...body, userId: req.user.id });
    if (event?.vehicleId) {
      void this.chargingIntelligence.refreshNeedClustersForVehicle(event.vehicleId).catch(() => {});
    }
    return event;
  }

  @Post('trips')
  @UseGuards(JwtAuthGuard)
  createTrip(
    @Req() req: { user: JwtUser },
    @Body() body: Parameters<TripsService['createTrip']>[0],
  ) {
    return this.trips.createTrip({ ...body, userId: req.user.id });
  }

  @Post('trips/:id/points')
  @UseGuards(JwtAuthGuard)
  appendTripPoints(
    @Param('id') id: string,
    @Body() body: Parameters<TripsService['appendTripPoints']>[1],
  ) {
    return this.trips.appendTripPoints(id, body);
  }

  @Post('trips/:id/finish')
  @UseGuards(JwtAuthGuard)
  finishTrip(@Param('id') id: string, @Body() body: Parameters<TripsService['finishTrip']>[1]) {
    return this.trips.finishTrip(id, body);
  }

  @Get('trips/:id/route-progress')
  @UseGuards(JwtAuthGuard)
  getTripRouteProgress(@Param('id') id: string) {
    return this.trips.getRouteProgress(id);
  }

  @Get('trips/:id/behavior')
  @UseGuards(JwtAuthGuard)
  getTripBehavior(@Param('id') id: string) {
    return this.tripBehavior.getTripBehaviorSummary(id);
  }

  @Patch('trips/:id/hvac-confirmation')
  @UseGuards(JwtAuthGuard)
  confirmTripHvac(@Param('id') id: string, @Body() body: { confirmed: boolean }) {
    return this.weather.confirmHvac(id, body.confirmed);
  }

  @Get('weather')
  getWeatherAtLocation(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (!lat || !lng || isNaN(latN) || isNaN(lngN)) return null;
    return this.weather.getWeatherAtLocation(latN, lngN);
  }

  @Get('users/:userId/driver-profile/:vehicleId')
  @UseGuards(JwtAuthGuard)
  getDriverProfile(
    @Req() req: { user: JwtUser },
    @Param('userId') userId: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    if (req.user.id !== userId) throw new ForbiddenException();
    return this.tripBehavior.getDriverProfile(userId, vehicleId);
  }

  @Post('users/:userId/push-token')
  @UseGuards(JwtAuthGuard)
  savePushToken(@Req() req: { user: JwtUser }, @Body() body: { token: string }) {
    return this.pushNotification.savePushToken(req.user.id, body.token);
  }

  @Get('route-fingerprints/:id/behavior')
  getRouteBehavior(@Param('id') id: string) {
    return this.tripBehavior.getRouteBehaviorSummary(id);
  }

  @Post('trips/:id/recap')
  @UseGuards(JwtAuthGuard)
  createTripRecap(@Param('id') id: string) {
    return this.tripRecaps.createRecap(id);
  }

  @Get('trips/:id/recap')
  @UseGuards(JwtAuthGuard)
  getTripRecap(@Param('id') id: string) {
    return this.tripRecaps.getRecapByTrip(id);
  }

  @Get('trips/:id/context-questions')
  @UseGuards(JwtAuthGuard)
  getTripContextQuestions(@Param('id') id: string) {
    return this.tripContext.getQuestionsForTrip(id);
  }

  @Post('trips/:id/context-answers')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  getTripContext(@Param('id') id: string) {
    return this.tripContext.getContextForTrip(id);
  }

  @Post('trips/:id/live-guidance')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getUsageProfile(@Param('id') id: string) {
    return this.vehicles.getUsageProfile(id);
  }

  @Get('vehicles/:id/charge-summary')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getChargeSummary(@Param('id') id: string) {
    return this.charging.getChargeSummary(id);
  }

  @Get('vehicles/:id/charge-summary-by-driver')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getChargeSummaryByDriver(@Param('id') id: string) {
    return this.charging.getChargeSummaryByDriver(id);
  }

  @Get('vehicles/:id/charge-km-estimate')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getChargeKmEstimate(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (isNaN(latN) || isNaN(lngN)) return { estimatedKm: null, source: 'none' };
    return this.charging.estimateKmSinceLastCharge(id, latN, lngN);
  }

  @Get('admin/charge-anomalies')
  @UseGuards(AdminApiKeyGuard)
  listChargeAnomalies(@Query('limit') limit?: string) {
    return this.charging.listAnomalousSessions(limit ? parseInt(limit) : 50);
  }

  @Get('vehicles/:id/trips')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listVehicleTrips(@Param('id') id: string) {
    return this.trips.listVehicleTrips(id);
  }

  @Get('vehicles/:id/trip-summary')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getTripSummary(@Param('id') id: string) {
    return this.trips.getTripSummary(id);
  }

  @Get('vehicles/:id/route-fingerprints/match-origin')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  matchRouteOrigin(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.routeFingerprints.matchOrigin(id, parseFloat(lat), parseFloat(lng));
  }

  @Get('vehicles/:id/route-fingerprints')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listVehicleRouteFingerprints(@Param('id') id: string) {
    return this.routeFingerprints.listVehicleRouteFingerprints(id);
  }

  @Get('vehicles/:id/route-summary')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getRouteSummary(@Param('id') id: string) {
    return this.routeFingerprints.getVehicleRouteSummary(id);
  }

  @Get('vehicles/:id/driver-intelligence')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getDriverIntelligence(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
  ) {
    return this.driverIntelligence.getIntelligence(req.user.id, id);
  }

  @Post('vehicles/:id/route-plans')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createRoutePlan(
    @Param('id') id: string,
    @Body() body: Parameters<RoutePlanningService['createPlan']>[1],
  ) {
    return this.routePlanning.createPlan(id, body);
  }

  @Get('vehicles/:id/route-plans/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestRoutePlan(@Param('id') id: string) {
    return this.routePlanning.getLatestPlan(id);
  }

  @Post('route-plans/:id/route-geometry')
  @UseGuards(JwtAuthGuard)
  createRouteGeometry(@Param('id') id: string, @Body() body: Parameters<RouteGeometryService['createSnapshot']>[1]) {
    return this.routeGeometry.createSnapshot(id, body);
  }

  @Get('route-plans/:id/route-geometry/latest')
  @UseGuards(JwtAuthGuard)
  getLatestRouteGeometry(@Param('id') id: string) {
    return this.routeGeometry.getLatestSnapshot(id);
  }

  @Post('route-plans/:id/charge-stop-poi-candidates')
  @UseGuards(JwtAuthGuard)
  createChargeStopPoiCandidates(@Param('id') id: string) {
    return this.chargeStopPois.createCandidates(id);
  }

  @Get('route-plans/:id/charge-stop-poi-candidates')
  @UseGuards(JwtAuthGuard)
  listChargeStopPoiCandidates(@Param('id') id: string) {
    return this.chargeStopPois.listCandidates(id);
  }

  @Post('route-plans/:id/premium-guidance')
  @UseGuards(JwtAuthGuard)
  createPremiumGuidance(@Param('id') id: string) {
    return this.premiumGuidance.createGuidance(id);
  }

  @Post('route-plans/:id/mock-guidance')
  @UseGuards(JwtAuthGuard)
  createMockGuidance(
    @Param('id') id: string,
    @Body() body: Parameters<PremiumGuidanceService['createMockGuidance']>[1],
  ) {
    return this.premiumGuidance.createMockGuidance(id, body);
  }

  @Get('vehicles/:id/trip-advisories/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestTripAdvisories(@Param('id') id: string) {
    return this.premiumGuidance.getLatestVehicleAdvisories(id);
  }

  @Get('vehicles/:id/community-benchmark')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getCommunityBenchmark(@Param('id') id: string) {
    return this.communityBenchmarks.getVehicleCommunityBenchmark(id);
  }

  @Get('vehicles/:id/battery-lifecycle')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getBatteryLifecycle(@Param('id') id: string) {
    return this.batteryLifecycle.getByVehicle(id);
  }

  @Get('vehicles/:id/monthly-report/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestMonthlyReport(@Param('id') id: string) {
    return this.monthlyReports.getLatestForVehicle(id);
  }

  @Get('vehicles/:id/annual-report/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestAnnualReport(@Param('id') id: string) {
    return this.annualReports.getLatestForVehicle(id);
  }

  @Get('vehicles/:id/first-card')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getFirstCard(@Param('id') id: string) {
    return this.vehicles.getFirstCard(id);
  }

  // ── Araç Sicili ──────────────────────────────────────────────────────────

  @Get('vehicles/:id/registry')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getRegistrySummary(@Param('id') id: string) {
    return this.vehicleRegistry.getRegistrySummary(id);
  }

  @Get('vehicles/:id/state-snapshots')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listStateSnapshots(@Param('id') id: string) {
    return this.vehicleRegistry.listStateSnapshots(id);
  }

  @Post('vehicles/:id/state-snapshots')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createStateSnapshot(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['createStateSnapshot']>[0],
  ) {
    return this.vehicleRegistry.createStateSnapshot({ ...body, vehicleId: id });
  }

  // ── Vehicle access (rol/izin) ─────────────────────────────────────────────

  @Get('vehicles/:vehicleId/access/me')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getMyVehicleAccess(
    @Req() req: { user: JwtUser },
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.vehicles.getMyVehicleAccess(req.user.id, vehicleId);
  }

  @Get('vehicles/:vehicleId/access')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listVehicleAccess(
    @Req() req: { user: JwtUser },
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.vehicles.listVehicleAccess(req.user.id, vehicleId);
  }

  @Post('vehicles/:vehicleId/access/:accessId/revoke')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  revokeVehicleAccess(
    @Req() req: { user: JwtUser },
    @Param('vehicleId') vehicleId: string,
    @Param('accessId') accessId: string,
  ) {
    return this.vehicles.revokeVehicleAccess(req.user.id, vehicleId, accessId);
  }

  // ── Vehicle access invites ────────────────────────────────────────────────

  @Post('vehicles/:vehicleId/invites')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createVehicleInvite(
    @Req() req: { user: JwtUser },
    @Param('vehicleId') vehicleId: string,
    @Body() body: { identifier: string; role?: string; permissions?: string[] },
  ) {
    return this.vehicles.createVehicleInvite(req.user.id, vehicleId, body);
  }

  @Post('vehicle-invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptVehicleInvite(
    @Req() req: { user: JwtUser },
    @Param('token') token: string,
  ) {
    return this.vehicles.acceptVehicleInvite(token, req.user.id);
  }

  // ── Legacy vehicle drivers (vehicle_drivers tablosu — sonra deprecate edilecek) ──

  @Get('vehicles/:id/drivers')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listDrivers(@Param('id') id: string) {
    return this.vehicleRegistry.listDrivers(id);
  }

  @Post('vehicles/:id/drivers')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  addDriver(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['addDriver']>[1],
  ) {
    return this.vehicleRegistry.addDriver(id, body);
  }

  @Get('vehicles/:id/transfer-requests')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  listTransferRequests(@Param('id') id: string) {
    return this.vehicleRegistry.listTransferRequests(id);
  }

  @Post('vehicles/:id/transfer-requests')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createTransferRequest(
    @Param('id') id: string,
    @Body() body: Parameters<VehicleRegistryService['createTransferRequest']>[1],
  ) {
    return this.vehicleRegistry.createTransferRequest(id, body);
  }

  @Patch('transfer-requests/:id')
  @UseGuards(JwtAuthGuard)
  resolveTransferRequest(
    @Param('id') id: string,
    @Body() body: { status: 'accepted' | 'cancelled' },
  ) {
    return this.vehicleRegistry.resolveTransferRequest(id, body.status);
  }

  @Post('vehicles/:id/public-report')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
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

  @Get('public/premium-reports/:id')
  getPublicPremiumReport(@Param('id') id: string) {
    return this.premiumVehicleReport.getReportById(id);
  }

  @Get('public/kasko-reports/:id')
  getPublicKaskoReport(@Param('id') id: string) {
    return this.aracSicili.getKaskoReportById(id);
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
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
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
  @UseGuards(JwtAuthGuard)
  createServiceVisit(
    @Req() req: { user: JwtUser },
    @Body() body: { vehicleId: string } & Parameters<ServiceVisitService['createVisit']>[1],
  ) {
    return this.serviceVisit.createVisit(body.vehicleId, body, req.user.id);
  }

  @Get('vehicles/:id/service-visits')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
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
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getServiceCompliance(@Param('id') id: string) {
    return this.serviceVisit.calculateComplianceRate(id);
  }

  @Post('vehicles/:id/assessment')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
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
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestAssessment(@Param('id') id: string, @Query('language') language?: string) {
    return this.evAssessment.getLatestAssessment(id, language);
  }

  @Post('vehicles/:id/premium-report')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createPremiumReport(
    @Param('id') id: string,
    @Body() body: { ownershipId?: string },
  ) {
    return this.premiumVehicleReport.createReport(id, body.ownershipId ?? null);
  }

  @Get('vehicles/:id/premium-report/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestPremiumReport(@Param('id') id: string) {
    return this.premiumVehicleReport.getLatestReport(id);
  }

  @Get('vehicles/:id/premium-report/preview')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  previewPremiumReport(@Param('id') id: string) {
    return this.premiumVehicleReport.buildReport(id);
  }

  @Post('vehicles/:id/external-battery-reports')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
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
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getExternalBatteryReports(@Param('id') id: string) {
    return this.premiumVehicleReport.fetchExternalReports(id);
  }

  // ── Sponsor Banner ───────────────────────────────────────────────────────

  @Get('sponsor')
  getSponsor() {
    return this.sponsor.get();
  }

  @Get('admin/sponsor')
  @UseGuards(AdminApiKeyGuard)
  getAdminSponsor() {
    return this.sponsor.get();
  }

  @Patch('admin/sponsor')
  @UseGuards(AdminApiKeyGuard)
  updateSponsor(@Body() body: Parameters<SponsorService['update']>[0]) {
    return this.sponsor.update(body);
  }

  // ── Admin: Bakım Adayları ─────────────────────────────────────────────────

  @Get('admin/maintenance-rule-candidates')
  @UseGuards(AdminApiKeyGuard)
  listMaintenanceCandidates(@Query('status') status?: string) {
    return this.aracSicili.listMaintenanceCandidates(status);
  }

  @Patch('admin/maintenance-rule-candidates/:id')
  @UseGuards(AdminApiKeyGuard)
  updateMaintenanceCandidate(
    @Param('id') id: string,
    @Body() body: { adminStatus: 'approved' | 'rejected' | 'needs_source'; adminNote?: string },
  ) {
    return this.aracSicili.updateCandidateStatus(id, body);
  }

  // ── Araç Sicili — Muayene ────────────────────────────────────────────────

  @Get('vehicles/:id/inspection')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getInspection(@Param('id') id: string) {
    return this.aracSicili.getInspection(id);
  }

  @Post('vehicles/:id/inspection')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  upsertInspection(
    @Param('id') id: string,
    @Body() body: InspectionUpsertBody,
  ) {
    return this.aracSicili.upsertInspection(id, body);
  }

  // ── Araç Sicili — Bakım Servis ───────────────────────────────────────────

  @Post('vehicles/:id/service-events')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  addServiceEvent(
    @Param('id') id: string,
    @Body() body: ServiceEventBody,
  ) {
    return this.aracSicili.addServiceEvent(id, body);
  }

  @Get('vehicles/:id/maintenance-status')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getMaintenanceStatus(@Param('id') id: string) {
    return this.aracSicili.getMaintenanceStatus(id);
  }

  // ── Araç Sicili — Değerleme & Sicil Özeti ────────────────────────────────

  @Get('vehicles/:id/valuation')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getValuation(@Param('id') id: string) {
    return this.aracSicili.getValuationSnapshot(id);
  }

  @Get('vehicles/:id/registry-snapshot')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getRegistrySnapshot(@Param('id') id: string) {
    return this.aracSicili.getRegistrySnapshot(id);
  }

  @Get('vehicles/:id/kasko-estimate')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getKaskoEstimate(@Param('id') id: string) {
    return this.aracSicili.getKaskoEstimate(id);
  }

  // ── Araç Sicili — Kasko Değer Talebi ─────────────────────────────────────

  @Get('vehicles/:id/insurance-value-requests/latest')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  getLatestInsuranceValueRequest(@Param('id') id: string) {
    return this.aracSicili.getLatestInsuranceValueRequest(id);
  }

  @Post('vehicles/:id/insurance-value-requests')
  @UseGuards(JwtAuthGuard, VehicleAccessGuard)
  createInsuranceValueRequest(
    @Param('id') id: string,
    @Body() body: { reportId?: string; vehiclePhotoUrls?: string[] },
  ) {
    return this.aracSicili.createInsuranceValueRequest(id, body.reportId, body.vehiclePhotoUrls);
  }
}
