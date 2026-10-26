import { Module } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({ controllers: [CatalogosController], providers: [CatalogosService] })
export class CatalogosModule {}
