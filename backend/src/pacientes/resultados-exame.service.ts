import {Injectable,NotFoundException} from '@nestjs/common';
import {AuthenticatedUser} from '../auth/auth.types';
import {databaseConflict} from '../clinico/clinical-validation';
import {PageQuery} from '../clinico/dto/clinico.dto';
import {ExameResponse} from '../clinico/dto/clinico.response';
import {ResultadoExameCreateDto,ResultadoExameResponse} from '../clinico/dto/resultado-exame.dto';
import {DatabaseService,Transaction} from '../common/database/database.service';
import {ClinicalAccessService} from '../common/security/clinical-access.service';
@Injectable()
export class ResultadosExameService {
  constructor(private readonly database:DatabaseService,private readonly access:ClinicalAccessService){}
  private async parent<T>(user:AuthenticatedUser,patientId:string,exameId:string,write:boolean,
    operation:(tx:Transaction,exam:ExameResponse)=>Promise<T>):Promise<T>{
    return this.database.transaction(async tx=>{
      await this.access.patient(tx,user,patientId,write);
      const row=(await tx.query<ExameResponse>(`SELECT e.paciente_exame_complementar_id::text AS "exameId",
        e.atendimento_id::text AS "atendimentoId",e.bloco_origem AS bloco,e.tipo_exame_original AS identificacao,
        e.resultado_texto AS resultado,e.observacoes,t.codigo_exame AS "codigoExame",t.nome_exame AS "nomeExame"
        FROM paciente_exame_complementar e JOIN tipo_exame_complementar t USING(tipo_exame_complementar_id)
        WHERE e.paciente_id=$1 AND e.paciente_exame_complementar_id=$2 ${write?'FOR UPDATE OF e':'FOR SHARE OF e'}`,
      [patientId,exameId])).rows[0];
      if(!row)throw new NotFoundException('Exame não encontrado');
      return operation(tx,row);
    },write?user.usuarioId:undefined).catch(databaseConflict);
  }
  async exam(user:AuthenticatedUser,patientId:string,exameId:string):Promise<ExameResponse>{
    return this.parent(user,patientId,exameId,false,async(_tx,exam)=>exam);
  }
  async list(user:AuthenticatedUser,patientId:string,exameId:string,page:PageQuery):Promise<ResultadoExameResponse[]>{
    return this.parent(user,patientId,exameId,false,async tx=>(await tx.query<ResultadoExameResponse>(`SELECT
      resultado_id::text AS "resultadoId",paciente_exame_complementar_id::text AS "exameId",nome_parametro AS "nomeParametro",
      valor_informado AS "valorInformado",unidade_informada AS "unidadeInformada",referencia_informada AS "referenciaInformada",
      interpretacao_informada AS "interpretacaoInformada",observacoes FROM paciente_exame_resultado
      WHERE paciente_exame_complementar_id=$1 ORDER BY resultado_id DESC LIMIT $2 OFFSET $3`,[exameId,page.limit,page.offset])).rows);
  }
  async create(user:AuthenticatedUser,patientId:string,exameId:string,dto:ResultadoExameCreateDto):Promise<{resultadoId:string}>{
    return this.parent(user,patientId,exameId,true,async tx=>(await tx.query<{resultadoId:string}>(`INSERT INTO paciente_exame_resultado
      (paciente_exame_complementar_id,nome_parametro,valor_informado,unidade_informada,referencia_informada,interpretacao_informada,observacoes)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING resultado_id::text AS "resultadoId"`,
    [exameId,dto.nomeParametro,dto.valorInformado??null,dto.unidadeInformada??null,dto.referenciaInformada??null,
      dto.interpretacaoInformada??null,dto.observacoes??null])).rows[0]);
  }
}
