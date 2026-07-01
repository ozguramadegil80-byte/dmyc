import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtUser } from './jwt-auth.guard';
import { VehiclesService } from './vehicles.service';

type GuardRequest = {
  params: Record<string, string | undefined>;
  user?: JwtUser;
};

@Injectable()
export class VehicleAccessGuard implements CanActivate {
  constructor(private readonly vehicles: VehiclesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GuardRequest>();

    if (!req.user) {
      throw new UnauthorizedException('JWT token gerekli.');
    }

    // vehicleId parametresi farklı isimlerde gelebilir
    const vehicleId = req.params['vehicleId'] ?? req.params['id'];
    if (!vehicleId) return true;

    const hasAccess = await this.vehicles.canAccessVehicle(req.user.id, vehicleId);
    if (!hasAccess) {
      throw new ForbiddenException('Bu araca erişim yetkiniz yok.');
    }

    return true;
  }
}
