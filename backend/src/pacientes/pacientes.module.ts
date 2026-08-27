import { Module } from '@nestjs/common';
import { PacientesController } from './pacientes.controller';
import { PacientesRepository } from './pacientes.repository';
import { PacientesService } from './pacientes.service';

@Module({ controllers: [PacientesController], providers: [PacientesService, PacientesRepository] })
export class PacientesModule {}
