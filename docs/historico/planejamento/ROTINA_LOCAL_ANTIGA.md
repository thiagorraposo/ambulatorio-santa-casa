# Rotina local antiga

> Documento histórico, movido de `planejamento/Rotina curta para voltar ao projeto no futuro.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

Da próxima vez, você pode usar esta sequência:

```
cd ~/Documentos/ambulatorio-santa-casa
code .
git status
git log --oneline
pg_lsclusters
psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost
```

Dentro do `psql`:

```
\dt
\q
```
