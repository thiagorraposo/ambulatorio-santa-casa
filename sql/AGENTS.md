# AGENTS.md

Regras para alterações em SQL e banco.

- Nunca editar migrations antigas aplicadas.
- Criar migration incremental numerada para toda evolução estrutural.
- Usar `SET search_path TO ambulatorio, public;` em scripts de schema/tabelas.
- Incluir comentários de objetivo e impacto da migration.
- Não depender de dados existentes no banco.
- Registrar rollback ou estratégia de reversão quando aplicável.
- Atualizar documentação física e `docs/REGISTRO_DE_ALTERACOES.md`.
- Criar ou atualizar teste SQL correspondente.
- Validar em banco limpo antes de considerar a migration concluída.
- Nunca usar `DROP ... CASCADE` sem decisão explícita.
- Nunca executar comandos destrutivos sem autorização explícita.
- Não inserir dados clínicos reais.
