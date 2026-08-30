import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser } from '../../auth/auth.types';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const started = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      const user = (request as Request & { user?: AuthenticatedUser }).user;
      this.logger.log(JSON.stringify({ event: 'http_request', method: request.method,
        path: request.path, status: response.statusCode, durationMs: Math.round(durationMs),
        ...(user ? { userId: user.usuarioId, perfil: user.perfil } : {}) }));
    });
    next();
  }
}
