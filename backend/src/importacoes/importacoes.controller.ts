import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { ImportacoesService } from './importacoes.service';
import { ImportacaoFinalidade, ImportacaoLoteDetalheResponse, ImportacaoLoteResponse, ImportacaoSubmitResponse } from './dto/importacao.response';
import { ImportacaoLoteQuery } from './dto/importacao.query';

class ImportarArquivoDto {
  @IsString() @IsIn(['carga_inicial', 'mesmo_conteudo', 'revisao']) finalidade!: ImportacaoFinalidade;
  @IsString() codigoLote!: string;
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() dryRun = false;
}

@Perfis('consulta', 'edicao', 'administracao')
@Controller('importacoes')
export class ImportacoesController {
  constructor(private readonly importacoes: ImportacoesService) {}

  @Post() @Perfis('edicao', 'administracao')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  submit(@UploadedFile() file: { originalname: string; buffer: Buffer; size: number } | undefined,
    @Body() dto: ImportarArquivoDto): Promise<ImportacaoSubmitResponse> {
    if (!file) throw new BadRequestException('Arquivo XLSX obrigatório');
    return this.importacoes.submit(file, dto.finalidade, dto.codigoLote, dto.dryRun);
  }

  @Get('lotes') list(@Query() query: PageQuery, @CurrentUser() user: AuthenticatedUser): Promise<ImportacaoLoteResponse[]> {
    return this.importacoes.list(query.limit, query.offset, user);
  }

  @Get('lotes/:id') async get(@Param('id', ClinicalIdPipe) id: string, @Query() query: ImportacaoLoteQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ImportacaoLoteDetalheResponse> {
    const result = await this.importacoes.get(user, id, query.limit, query.offset, query.apenasComErro);
    if (!result) throw new NotFoundException('Lote não encontrado');
    return result;
  }
}
