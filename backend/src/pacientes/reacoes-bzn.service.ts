import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { BznReactionDto, PageQuery } from '../clinico/dto/clinico.dto';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
export interface ReacaoBznResponse {
  reacaoId:string; tratamentoId:string; descricao:string|null; gravidade:string|null;
  dataReacao:string|null; consequencia:string|null; observacoes:string|null;
}
@Injectable()
export class ReacoesBznService {
  constructor(private readonly database:DatabaseService,private readonly access:ClinicalAccessService) {}
  private async treatment<T>(user:AuthenticatedUser,patientId:string,write:boolean,operation:(tx:Transaction,id:string)=>Promise<T>):Promise<T> {
    return this.database.transaction(async tx=>{
      await this.access.patient(tx,user,patientId,write);
      const row=(await tx.query<{id:string}>(`SELECT tratamento_benzonidazol_id::text AS id
        FROM tratamento_benzonidazol WHERE paciente_id=$1 ${write?'FOR UPDATE':'FOR SHARE'}`,[patientId])).rows[0];
      if(!row)throw new NotFoundException('Tratamento BZN não encontrado');
      return operation(tx,row.id);
    },write?user.usuarioId:undefined).catch(databaseConflict);
  }
  async list(user:AuthenticatedUser,patientId:string,page:PageQuery):Promise<ReacaoBznResponse[]> {
    return this.treatment(user,patientId,false,async(tx,id)=>(await tx.query<ReacaoBznResponse>(`SELECT
      reacao_adversa_benzonidazol_id::text AS "reacaoId",tratamento_benzonidazol_id::text AS "tratamentoId",
      descricao,gravidade,data_reacao::text AS "dataReacao",consequencia,observacoes
      FROM reacao_adversa_benzonidazol WHERE tratamento_benzonidazol_id=$1
      ORDER BY reacao_adversa_benzonidazol_id DESC LIMIT $2 OFFSET $3`,[id,page.limit,page.offset])).rows);
  }
  async create(user:AuthenticatedUser,patientId:string,dto:BznReactionDto):Promise<{reacaoId:string}> {
    return this.treatment(user,patientId,true,async(tx,id)=>{
      if(!dto.descricao.trim())throw new BadRequestException('Descrição da reação é obrigatória');
      return (await tx.query<{reacaoId:string}>(`INSERT INTO reacao_adversa_benzonidazol
        (tratamento_benzonidazol_id,descricao,gravidade,data_reacao,consequencia,observacoes)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING reacao_adversa_benzonidazol_id::text AS "reacaoId"`,
      [id,dto.descricao,dto.gravidade??null,dto.dataReacao??null,dto.consequencia??null,dto.observacoes??null])).rows[0];
    });
  }
}
