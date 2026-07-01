import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtUser {
  id: string;
  email: string;
}

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.headers['authorization'];
    const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!value?.startsWith('Bearer ')) {
      throw new UnauthorizedException('JWT token gerekli.');
    }

    const token = value.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token.');
    }
  }
}
