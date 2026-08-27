import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody { statusCode: number; error: string; message: string | string[] }

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.SERVICE_UNAVAILABLE;
    const body = this.body(exception, status);
    if (!(exception instanceof HttpException)) {
      this.logger.error(JSON.stringify({ event: 'request_error', method: request.method,
        path: request.path, status, errorType: exception instanceof Error ? exception.name : 'UnknownError' }));
    }
    response.status(status).json(body);
  }

  private body(exception: unknown, status: number): ErrorBody {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null) {
        const value = payload as Partial<ErrorBody>;
        return { statusCode: status, error: String(value.error ?? exception.name),
          message: value.message ?? exception.message };
      }
      return { statusCode: status, error: exception.name, message: String(payload) };
    }
    return { statusCode: status, error: 'Service Unavailable',
      message: 'Serviço temporariamente indisponível' };
  }
}
