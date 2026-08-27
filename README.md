# Gerador de Documentos HTML

Aplicação web para montar documentos no padrão de Termo de Referência com
numeração automática de títulos, itens e subitens (até 6 níveis), notas
explicativas, tabelas e salvamento automático no navegador. O documento gerado
pode ser baixado como arquivo HTML pronto para uso.

## Funcionalidades

- Numeração automática de títulos (`1.`), itens (`1.1`) e subitens (`1.1.1`) — até 6 níveis.
- Título do documento, títulos de seção, itens, subitens, notas explicativas (com ícone) e tabelas (numeradas ou não).
- Pré-visualização ao vivo do HTML gerado.
- Salvamento automático no `localStorage` e tema claro/escuro persistido.
- Download do documento como arquivo `.html`.

## Validação automática (itens repetidos e itens vazios)

Ao editar o documento, o editor verifica duas situações para evitar erros por engano:

1. **Itens repetidos** — se algum texto (título, item, subitem, nota ou legenda de
   tabela) aparecer mais de uma vez no documento, todas as ocorrências ficam
   destacadas em vermelho e um aviso aparece abaixo do campo. A comparação ignora
   maiúsculas/minúsculas e espaços.
2. **Item vazio acima de conteúdo preenchido** — se houver um item vazio e existir
   algum conteúdo preenchido depois dele **na ordem do documento** (considerando
   itens, subitens e notas de qualquer profundidade — inclusive subitens de um item
   irmão acima), o item vazio é destacado em âmbar com aviso, pois provavelmente foi
   criado por engano.

Para não travar a digitação, a validação roda com **debounce de 3 segundos** após a
última alteração. Se uma alteração acontecer durante uma verificação em andamento,
o resultado obsoleto é descartado e uma nova verificação é agendada após novo
debounce; nunca há duas verificações rodando ao mesmo tempo. Quando há problemas,
um resumo aparece no topo do editor (ex.: "2 itens repetidos · 1 item vazio acima
de conteúdo").

### Implementação

| Módulo | Responsabilidade |
| --- | --- |
| `src/lib/validation.ts` | Lógica pura: normalização de texto, achatamento da árvore na ordem do documento (`flattenNodes`), detecção de duplicatas (`findDuplicateIds`) e de itens vazios acima de conteúdo (`findEmptyAboveFilledIds`). |
| `src/lib/debouncedValidator.ts` | Agendador com debounce, cancelamento de verificações obsoletas e guarda contra execução simultânea. |
| `src/useValidation.ts` | Hook React que liga o documento ao agendador e expõe o resultado (`duplicateIds`, `emptyAboveFilledIds`). |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento (Vite). |
| `npm run build` | Typecheck (`tsc -b`) + build de produção. |
| `npm test` | Executa os testes (Vitest). |
| `npm run test:watch` | Testes em modo watch. |
| `npm run deploy` | Build e publicação no GitHub Pages. |

## Estrutura

- `src/App.tsx` — editor principal, cards dos nós e integração da validação.
- `src/lib/` — lógica pura e testes:
  - `types.ts`, `doc.ts` — modelo de dados e operações na árvore de nós.
  - `numbering.ts` — numeração automática.
  - `html.ts` — geração do HTML final.
  - `tableOps.ts` — operações de tabela.
  - `storage.ts` — persistência no `localStorage`.
  - `validation.ts`, `debouncedValidator.ts` — regras de validação e agendador.
- `src/useValidation.ts` — hook de validação com debounce.

## Testes

- `src/lib/__tests__/validation.test.ts` — regras de duplicatas e itens vazios, incluindo `flattenNodes`.
- `src/lib/__tests__/debouncedValidator.test.ts` — debounce, cancelamento de verificação obsoleta e guarda de execução simultânea.
- Demais suites cobrem numeração, geração de HTML, operações de tabela e storage.

> Observação: a suite `model.test.ts` depende de uma fixture local
> (`src/lib/__tests__/fixtures/converted.html`) que está gitignored e não é
> versionada.