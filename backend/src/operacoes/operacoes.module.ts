import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OperacoesController } from './operacoes.controller';
import { OperacoesInterceptor } from './operacoes.interceptor';
import { OperacoesService } from './operacoes.service';

@Module({
  controllers: [OperacoesController],
  providers: [OperacoesService, { provide: APP_INTERCEPTOR, useClass: OperacoesInterceptor }],
})
export class OperacoesModule {}
