import { Module } from '@nestjs/common';
import { ImportacoesController } from './importacoes.controller';
import { ImportacoesService } from './importacoes.service';

@Module({ controllers: [ImportacoesController], providers: [ImportacoesService] })
export class ImportacoesModule {}
