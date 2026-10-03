import { Module } from '@nestjs/common';
import { PacientesController } from './pacientes.controller';
import { PacientesRepository } from './pacientes.repository';
import { PacientesService } from './pacientes.service';
import { RecursosClinicosController } from './recursos-clinicos.controller';
import { RecursosClinicosService } from './recursos-clinicos.service';

@Module({ controllers: [PacientesController, RecursosClinicosController],
  providers: [PacientesService, PacientesRepository, RecursosClinicosService] })
export class PacientesModule {}
