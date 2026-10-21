export interface SendOtpInput { countryCode: string; mobile: string; otp: string }
export interface OtpProvider { readonly id: string; sendOtp(input: SendOtpInput): Promise<void> }

export class DevelopmentOtpProvider implements OtpProvider {
  readonly id = 'development'
  async sendOtp(_input: SendOtpInput) { return Promise.resolve() }
}

export class ProductionSmsOtpProvider implements OtpProvider {
  readonly id = 'production-placeholder'
  async sendOtp(_input: SendOtpInput): Promise<void> { throw new Error('Production SMS provider is not configured. Configure an authorized MSG91, Twilio, AWS SNS, or equivalent adapter.') }
}
