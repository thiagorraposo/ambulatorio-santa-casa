import { MedicamentosController } from './medicamentos.controller';
import { MedicamentosService } from './medicamentos.service';
import { ObitoController } from './obito.controller';
import { ObitoService } from './obito.service';
import { DispositivosController } from './dispositivos.controller';
import { DispositivosService } from './dispositivos.service';
import { AvcsController } from './avcs.controller';
import { AvcsService } from './avcs.service';
import { ComorbidadesController } from './comorbidades.controller';
import { ComorbidadesService } from './comorbidades.service';
import { ComplicacoesChagasController } from './complicacoes-chagas.controller';
import { ComplicacoesChagasService } from './complicacoes-chagas.service';
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

@Module({ controllers: [MedicamentosController, ObitoController, DispositivosController, AvcsController, ComorbidadesController, PacientesController, RecursosClinicosController, SorologiasController, CondicaoChagasController, ComplicacoesChagasController],
  providers: [MedicamentosService, ObitoService, DispositivosService, AvcsService, ComorbidadesService, PacientesService, PacientesRepository, RecursosClinicosService, SorologiasService, CondicaoChagasService, ComplicacoesChagasService] })
export class PacientesModule {}
