import { Module } from '@nestjs/common';
import { CondicaoChagasController } from './condicao-chagas.controller';
import { CondicaoChagasService } from './condicao-chagas.service';
import { PacientesController } from './pacientes.controller';
import { PacientesRepository } from './pacientes.repository';
import { PacientesService } from './pacientes.service';
import { RecursosClinicosController } from './recursos-clinicos.controller';
import { RecursosClinicosService } from './recursos-clinicos.service';
import { SorologiasController } from './sorologias.controller';
import { SorologiasService } from './sorologias.service';

@Module({ controllers: [PacientesController, RecursosClinicosController, SorologiasController, CondicaoChagasController],
  providers: [PacientesService, PacientesRepository, RecursosClinicosService, SorologiasService, CondicaoChagasService] })
export class PacientesModule {}
