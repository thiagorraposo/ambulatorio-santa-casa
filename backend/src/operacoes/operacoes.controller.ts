import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { OperationIdDto, RegisterOperationDto } from './dto/operacao.dto';
import { OperationResponse } from './operacoes.contract';
import { OperacoesService } from './operacoes.service';

@Perfis('consulta','edicao','administracao')
@Controller('operacoes')
export class OperacoesController {
  constructor(private readonly operations: OperacoesService) {}

  @Post() @Perfis('edicao','administracao')
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterOperationDto): Promise<OperationResponse> {
    return this.operations.register(user, dto);
  }

  @Get(':operacaoId')
  get(@CurrentUser() user: AuthenticatedUser, @Param() params: OperationIdDto): Promise<OperationResponse> {
    return this.operations.get(user, params.operacaoId);
  }

  @Post(':operacaoId/encerrar') @HttpCode(200)
  close(@CurrentUser() user: AuthenticatedUser, @Param() params: OperationIdDto): Promise<OperationResponse> {
    return this.operations.close(user, params.operacaoId);
  }
}
