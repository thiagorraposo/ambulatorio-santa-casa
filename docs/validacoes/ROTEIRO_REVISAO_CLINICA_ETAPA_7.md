# Roteiro de revisão clínica da Etapa 7

Preparado em 2026-10-15. **Revisão humana pendente; este roteiro não registra aceite.**

A [7D do roadmap](../PROXIMOS_PASSOS.md#etapa-7--fluxos-clínicos) exige revisão
com a equipe. As [provas técnicas](VALIDACAO_ETAPA_7.md) já cobrem API, componentes,
falhas e acessibilidade automatizada. Esta revisão deve confirmar que a equipe
entende os registros, encontra as ações e consegue completar o atendimento no
recorte original 7A–7D. Melhorias propostas de UX/VU1 têm aceite separado.

## Preparação

Use somente a demonstração sintética e os dados identificados como sintéticos.
Com as variáveis `SYNTHETIC_PG_*`/`PGPASSWORD` de um servidor descartável
configuradas conforme [o runner](../../tests/frontend/README.md), execute:

```bash
make backend-build COMPACT=1
bash tests/frontend/test_e2e.sh --serve
```

O runner informa a URL e os três logins sintéticos; a senha de demonstração é
`Etapa6-sintetica!`. `--serve` oferece sessão de 15 minutos. Os testes automáticos
continuam usando 60 segundos para comprovar expiração. A demonstração termina
com SIGINT/SIGTERM, removendo somente banco/login/processos criados pelo runner.
Migrations e dados do ambiente persistente não participam desta revisão.

Separe uma pessoa da equipe para operar e outra para registrar observações.
Registre o perfil, a tarefa, o resultado e o ponto exato de qualquer dificuldade.
Guarde somente IDs/observações sintéticos; não use dados de pacientes reais.

## Percurso a observar

| Passo | Tarefa da equipe | Resultado a conferir |
| --- | --- | --- |
| 1 | Entrar como consulta, buscar por nome/sexo, mudar página, abrir ficha e atendimento; usar voltar e recarregar. | Pessoa/consulta corretas, contexto compreensível, sem ações de gravação. Recarregar pede login porque a sessão vive em memória. |
| 2 | Entrar como edição e abrir um paciente permitido da fixture e o paciente reservado. | Edição disponível apenas no contexto autorizado; recusa compreensível, sem expor ficha alheia. |
| 3 | Como administração, buscar antes de cadastrar uma pessoa sintética; informar nascimento, endereço e telefone. Abrir e editar o cadastro salvo. | Nome/ID e confirmação reconhecíveis; idade calculada com referência; contatos/endereço preservados. Possíveis homônimos não são fundidos. |
| 4 | Criar atendimento com medida clínica, descoberta por autorrelato, exame solicitado sem resultado, familiar identificado e pendência desconhecida. | Nenhum campo preenchido se perde; núcleo/filhos aparecem juntos; descoberta não vira data de sorologia e desconhecido difere de não informado. |
| 5 | A partir desse atendimento, registrar BZN com reação e dois retornos efetivos. | Consulta de origem mantida; datas informadas pela equipe; tratamento único; cada retorno tem confirmação e ID próprios, com histórico anterior preservado. |
| 6 | Registrar projeto, notificação, encaminhamento e dois episódios de contrarreferência; resolver a pendência com data. | Associação ao paciente/consulta certa; textos/estados preservados; repetição exige nova intenção explícita; resolução exige data. |
| 7 | Informar somente um ano de comparecimento e reler a ficha/histórico. | Ano não fabrica visita nem data completa; registros confirmados e limites dos módulos ficam claros. |
| 8 | Alterar um campo sem salvar e navegar para outro módulo; voltar ao rascunho. Em duas abas, tentar salvar versões concorrentes do mesmo paciente/atendimento. | Aviso e recuperação de rascunho compreensíveis; 409 conserva versão original e valores, sem sobrescrita automática. |
| 9 | Percorrer ações com teclado; avaliar foco, diálogo, texto de erros/confirmações, zoom 200% e tela estreita. | Rótulos e ordem claros; ações alcançáveis; foco visível; leitura suficiente para distinguir salvo, rascunho e resultado incerto. |

Falhas de rede após COMMIT, revogação durante escrita e conflito BZN possuem
cenários técnicos reproduzíveis no [relatório](VALIDACAO_ETAPA_7.md). A equipe
deve avaliar também as mensagens e decisões desses cenários quando apresentados;
os testes automáticos não constituem aprovação da interpretação clínica.

## Registro a preencher pela equipe

| Campo | Resposta |
| --- | --- |
| Data e ambiente/URL da demonstração | Pendente |
| Identificação e função dos revisores | Pendente |
| Passos executados e perfis usados | Pendente |
| IDs sintéticos do paciente/atendimento e registros conferidos | Pendente |
| Resultado por passo: aprovado, problema encontrado ou não executado | Pendente |
| Problemas de uso, passos para reproduzir e impacto no atendimento | Pendente |
| Resultado do recorte original: aprovado, aprovado com pendências ou recusado | Pendente |
| Responsável pelo parecer e data | Pendente |

O aceite exige parecer explícito da equipe, com tarefas efetivamente executadas
e pendências identificadas. Passo não executado permanece sem comprovação.
Problemas encontrados voltam para correção e validação proporcional; somente
depois o relatório e o status do goal podem refletir o aceite integral.
