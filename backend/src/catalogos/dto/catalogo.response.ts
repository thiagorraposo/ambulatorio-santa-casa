export interface CatalogoResponse {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

/** Catálogo SQL06 não possui coluna codigo; não fabricar código clínico. */
export interface ComorbidadeCatalogoResponse {
  id: string;
  nome: string;
  ativo: boolean;
}
