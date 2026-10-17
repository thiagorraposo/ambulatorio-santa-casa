import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { from, lastValueFrom, Observable } from 'rxjs';
import { AuthenticatedUser } from '../auth/auth.types';
import { clinicalOperationContext } from '../common/database/clinical-operation.context';
import { OperacoesService } from './operacoes.service';

@Injectable()
export class OperacoesInterceptor implements NestInterceptor {
  constructor(private readonly operations: OperacoesService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const id = request.headers['x-operacao-id'];
    if (id === undefined) return next.handle(); // Compatibility for existing HTTP clients.
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('X-Operacao-Id deve ser UUID v4');
    }
    return from(this.execute(request, id, next));
  }

  private async execute(request: Request & { user: AuthenticatedUser }, id: string, next: CallHandler): Promise<unknown> {
    const scope = await this.operations.claim(request.user, id, request.method, request.path, request.body);
    try {
      const result = await clinicalOperationContext.run(scope, () => lastValueFrom(next.handle()));
      if (!scope.transactionStarted) throw new Error('Operação sem transação clínica atribuída');
      return result;
    } catch (error) {
      await this.operations.failed(request.user, id);
      throw error;
    }
  }
}
