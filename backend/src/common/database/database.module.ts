import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ClinicalAccessService } from '../security/clinical-access.service';

@Global()
@Module({ providers: [DatabaseService, ClinicalAccessService], exports: [DatabaseService, ClinicalAccessService] })
export class DatabaseModule {}
