import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const provided = request.headers['x-dmyc-admin-key'];
    const value = Array.isArray(provided) ? provided[0] : provided;
    const expected = process.env.DMYC_ADMIN_API_KEY ?? 'dmyc-local-admin-api-key-change-me';

    if (!value || !safeEqual(value, expected)) {
      throw new UnauthorizedException('Admin API anahtarı gerekli.');
    }
    return true;
  }
}

function safeEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
