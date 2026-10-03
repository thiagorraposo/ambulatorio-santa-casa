import { Module } from '@nestjs/common';
import { ImportacoesController } from './importacoes.controller';
import { ImportacoesService } from './importacoes.service';
import { RevisoesController } from './revisoes.controller';
import { RevisoesService } from './revisoes.service';

@Module({ controllers: [ImportacoesController, RevisoesController], providers: [ImportacoesService, RevisoesService] })
export class ImportacoesModule {}
