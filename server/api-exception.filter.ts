import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'
import type { Response } from 'express'
import { AppError } from './app-error'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    if (error instanceof AppError) { response.status(error.status).json({ statusCode: error.status, code: error.code, message: error.message }); return }
    if (error instanceof HttpException) { const status = error.getStatus(); response.status(status).json({ statusCode: status, code: status === 401 ? 'AUTH_REQUIRED' : 'REQUEST_FAILED', message: error.message }); return }
    const production = process.env.NODE_ENV === 'production'
    response.status(500).json({ statusCode: 500, code: 'INTERNAL_ERROR', message: production ? 'An internal error occurred.' : error instanceof Error ? error.message : 'An internal error occurred.' })
  }
}
