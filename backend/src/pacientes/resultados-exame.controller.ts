import {Body,Controller,Get,Param,Post,Query} from '@nestjs/common';
import {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {Perfis} from '../auth/perfis.decorator';
import {ClinicalIdPipe} from '../clinico/clinical-validation';
import {PageQuery} from '../clinico/dto/clinico.dto';
import {ExameResponse} from '../clinico/dto/clinico.response';
import {ResultadoExameCreateDto,ResultadoExameResponse} from '../clinico/dto/resultado-exame.dto';
import {ResultadosExameService} from './resultados-exame.service';
@Perfis('consulta','edicao','administracao')
@Controller('pacientes/:id/exames/:exameId')
export class ResultadosExameController {
  constructor(private readonly resultados:ResultadosExameService){}
  @Get()
  exam(@Param('id',ClinicalIdPipe) id:string,@Param('exameId',ClinicalIdPipe) exameId:string,
    @CurrentUser() user:AuthenticatedUser):Promise<ExameResponse>{return this.resultados.exam(user,id,exameId);}
  @Get('resultados')
  list(@Param('id',ClinicalIdPipe) id:string,@Param('exameId',ClinicalIdPipe) exameId:string,
    @Query() page:PageQuery,@CurrentUser() user:AuthenticatedUser):Promise<ResultadoExameResponse[]>{return this.resultados.list(user,id,exameId,page);}
  @Post('resultados') @Perfis('edicao','administracao')
  create(@Param('id',ClinicalIdPipe) id:string,@Param('exameId',ClinicalIdPipe) exameId:string,
    @Body() dto:ResultadoExameCreateDto,@CurrentUser() user:AuthenticatedUser):Promise<{resultadoId:string}>{return this.resultados.create(user,id,exameId,dto);}
}
