import { CanActivate, ExecutionContext, Inject } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'

export interface AuthenticatedRequest extends Request { authUser?: { id: string; countryCode: string; mobile: string; verified: boolean } }
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const result = await this.auth.authenticate(request.headers.authorization)
    request.authUser = result.user
    return true
  }
}
