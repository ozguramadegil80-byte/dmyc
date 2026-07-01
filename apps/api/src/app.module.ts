import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AdminReviewService } from './admin-review.service';
import { AnnualReportService } from './annual-report.service';
import { BatteryLifecycleService } from './battery-lifecycle.service';
import { MonthlyReportService } from './monthly-report.service';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { ChargingIntelligenceService } from './charging-intelligence.service';
import { ChargingService } from './charging.service';
import { DriverIntelligenceService } from './driver-intelligence.service';
import { PushNotificationService } from './push-notification.service';
import { ChargeStopPoiService } from './charge-stop-poi.service';
import { CommunityBenchmarkService } from './community-benchmark.service';
import { DatabaseService } from './database.service';
import { ElectricityTariffService } from './electricity-tariff.service';
import { EvAssessmentService } from './ev-assessment.service';
import { FirstCardService } from './first-card.service';
import { InsightStudioService } from './insight-studio.service';
import { GoogleMapsService } from './google-maps.service';
import { PremiumVehicleReportService } from './premium-vehicle-report.service';
import { PremiumAccessService } from './premium-access.service';
import { PremiumGuidanceService } from './premium-guidance.service';
import { RouteFingerprintService } from './route-fingerprint.service';
import { TripBehaviorService } from './trip-behavior.service';
import { WeatherService } from './weather.service';
import { RouteGeometryService } from './route-geometry.service';
import { RoutePlanningService } from './route-planning.service';
import { SavedLocationsService } from './saved-locations.service';
import { ServiceVisitService } from './service-visit.service';
import { TripContextService } from './trip-context.service';
import { TripsService } from './trips.service';
import { TripRecapService } from './trip-recap.service';
import { UsageProfileService } from './usage-profile.service';
import { VehicleRegistryService } from './vehicle-registry.service';
import { VehicleSpecsService } from './vehicle-specs.service';
import { VehiclesService } from './vehicles.service';
import { SponsorService } from './sponsor.service';
import { AracSiciliService } from './arac-sicili.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { VehicleAccessGuard } from './vehicle-access.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dmyc-local-jwt-secret-change-in-production',
      signOptions: { expiresIn: '30d' },
      global: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AdminReviewService,
    AnnualReportService,
    BatteryLifecycleService,
    MonthlyReportService,
    AdminApiKeyGuard,
    ChargingIntelligenceService,
    ChargingService,
    DriverIntelligenceService,
    PushNotificationService,
    ChargeStopPoiService,
    CommunityBenchmarkService,
    DatabaseService,
    ElectricityTariffService,
    EvAssessmentService,
    FirstCardService,
    InsightStudioService,
    GoogleMapsService,
    PremiumVehicleReportService,
    PremiumAccessService,
    PremiumGuidanceService,
    RouteFingerprintService,
    TripBehaviorService,
    WeatherService,
    RouteGeometryService,
    RoutePlanningService,
    SavedLocationsService,
    ServiceVisitService,
    TripContextService,
    TripsService,
    TripRecapService,
    UsageProfileService,
    VehicleRegistryService,
    VehicleSpecsService,
    VehiclesService,
    SponsorService,
    AracSiciliService,
    JwtAuthGuard,
    VehicleAccessGuard,
  ],
})
export class AppModule {}
