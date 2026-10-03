import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Perfis } from '../auth/perfis.decorator';
import { ConcederAutorizacaoRevisaoDto, FinalizarRevisaoDto, PrepararRevisaoDto, PublicarDecisaoDto,
  RegistrarFonteRevisaoDto, RevogarAutorizacaoRevisaoDto, SimularArquivoDto,
  SimularDecisaoDto, SimularPropostaDto } from './revisoes.dto';
import { RevisoesService } from './revisoes.service';
import { RevisaoAplicacaoResponse, RevisaoDecisaoSimulacaoResponse, RevisaoPropostaSimulacaoResponse, RevisaoRecebimentoResponse } from './dto/revisao.response';

@Perfis('administracao')
@Controller('importacoes/revisoes')
export class RevisoesController {
  constructor(private readonly revisoes: RevisoesService) {}

  @Post('fontes')
  registerSource(@Body() dto: RegistrarFonteRevisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ fonteId: string }> {
    return this.revisoes.registerSource(dto, user.usuarioId);
  }

  @Post('autorizacoes')
  grantAuthorization(@Body() dto: ConcederAutorizacaoRevisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ autorizacaoId: string }> {
    return this.revisoes.grantAuthorization(dto, user.usuarioId);
  }

  @Post('autorizacoes/revogar')
  revokeAuthorization(@Body() dto: RevogarAutorizacaoRevisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ revogada: true }> {
    return this.revisoes.revokeAuthorization(dto, user.usuarioId);
  }

  @Post('propostas/simular')
  simulateProposal(@Body() dto: SimularPropostaDto, @CurrentUser() user: AuthenticatedUser): Promise<RevisaoPropostaSimulacaoResponse> {
    return this.revisoes.simulateProposal(dto, user.usuarioId);
  }

  @Post('propostas/arquivo/simular')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  simulateWorkbook(@UploadedFile() file: { originalname: string; buffer: Buffer; size: number } | undefined,
    @Body() dto: SimularArquivoDto, @CurrentUser() user: AuthenticatedUser): Promise<RevisaoPropostaSimulacaoResponse> {
    if (!file) throw new BadRequestException('Arquivo XLSX obrigatório');
    return this.revisoes.simulateWorkbookProposal(file, dto, user.usuarioId);
  }

  @Post('preparar')
  prepare(@Body() dto: PrepararRevisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ revisaoId: string }> {
    return this.revisoes.prepare(dto, user.usuarioId);
  }

  @Post('arquivos/receber')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  receiveWorkbook(@UploadedFile() file: { originalname: string; buffer: Buffer; size: number } | undefined,
    @Body() dto: SimularArquivoDto, @CurrentUser() user: AuthenticatedUser): Promise<RevisaoRecebimentoResponse> {
    if (!file) throw new BadRequestException('Arquivo XLSX obrigatório');
    return this.revisoes.receiveWorkbook(file, dto, user.usuarioId);
  }

  @Post('decisoes/simular')
  simulateDecision(@Body() dto: SimularDecisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<RevisaoDecisaoSimulacaoResponse> {
    return this.revisoes.simulateDecision(dto, user.usuarioId);
  }

  @Post('decisoes/publicar')
  publishDecision(@Body() dto: PublicarDecisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ decisaoId: string }> {
    return this.revisoes.publishDecision(dto, user.usuarioId);
  }

  @Post('decisoes/aplicar')
  applyDecision(@Body() dto: SimularDecisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<RevisaoAplicacaoResponse> {
    return this.revisoes.applyDecision(dto, user.usuarioId);
  }

  @Post('finalizar')
  finish(@Body() dto: FinalizarRevisaoDto, @CurrentUser() user: AuthenticatedUser): Promise<{ estado: string }> {
    return this.revisoes.finish(dto, user.usuarioId);
  }
}
