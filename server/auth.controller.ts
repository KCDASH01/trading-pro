import { Body, Controller, Get, Headers, Inject, Ip, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { SessionAuthGuard } from './session-auth.guard'
import { CurrentUser } from './current-user.decorator'

@Controller('api/v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('auth/send-otp') sendOtp(@Body() body: { countryCode?: string; mobile?: string }, @Ip() ip: string) { return this.auth.sendOtp(body.countryCode ?? '', body.mobile ?? '', ip) }
  @Post('auth/verify-otp') verifyOtp(@Body() body: { countryCode?: string; mobile?: string; otp?: string }, @Req() request: Request) { return this.auth.verifyOtp(body.countryCode ?? '', body.mobile ?? '', body.otp ?? '', request.headers['user-agent']) }
  @UseGuards(SessionAuthGuard) @Post('auth/logout') logout(@Headers('authorization') header?: string) { return this.auth.logout(header) }
  @UseGuards(SessionAuthGuard) @Get('me') me(@CurrentUser() user: { id: string; countryCode: string; mobile: string; verified: boolean }) { return user }
}
