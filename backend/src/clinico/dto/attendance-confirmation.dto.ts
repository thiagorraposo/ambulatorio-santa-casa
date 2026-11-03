import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { AttendanceCreateDto, BznTreatmentDataDto } from './clinico.dto';
import { CondicaoChagasCreateDto } from './condicao-chagas.dto';
import { SorologiaCreateDto } from './sorologia.dto';
import { ComplicacaoChagasCreateDto } from './complicacao-chagas.dto';
import { ComorbidadesCreateDto } from './comorbidades.dto';
import { AvcCreateDto } from './avc.dto';
import { DispositivoCreateDto } from './dispositivo.dto';
import { ObitoCreateDto } from './obito.dto';
import { NotificationDto, ProjectDto, ReferralDataDto } from './recursos.dto';

/** Additive contract: original attendance creation remains independently available. */
export class AttendanceConfirmationDto extends AttendanceCreateDto {
  @IsOptional() @IsObject() @ValidateNested() @Type(() => CondicaoChagasCreateDto) condicaoChagas?: CondicaoChagasCreateDto;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => SorologiaCreateDto) sorologias?: SorologiaCreateDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => ComplicacaoChagasCreateDto) complicacoesChagas?: ComplicacaoChagasCreateDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ComorbidadesCreateDto) comorbidades?: ComorbidadesCreateDto;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => AvcCreateDto) avcs?: AvcCreateDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => DispositivoCreateDto) dispositivos?: DispositivoCreateDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ObitoCreateDto) obito?: ObitoCreateDto;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => ProjectDto) projetos?: ProjectDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => BznTreatmentDataDto) tratamentoBzn?: BznTreatmentDataDto;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) @ValidateNested({ each: true }) @Type(() => ReferralDataDto) encaminhamentos?: ReferralDataDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => NotificationDto) notificacao?: NotificationDto;
}
