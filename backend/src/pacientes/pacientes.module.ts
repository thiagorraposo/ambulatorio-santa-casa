import { Module } from '@nestjs/common';
import { PacientesController } from './pacientes.controller';
import { PacientesRepository } from './pacientes.repository';
import { PacientesService } from './pacientes.service';
import { RecursosClinicosController } from './recursos-clinicos.controller';
import { RecursosClinicosService } from './recursos-clinicos.service';
import { SorologiasController } from './sorologias.controller';
import { SorologiasService } from './sorologias.service';

@Module({ controllers: [PacientesController, RecursosClinicosController, SorologiasController],
  providers: [PacientesService, PacientesRepository, RecursosClinicosService, SorologiasService] })
export class PacientesModule {}
