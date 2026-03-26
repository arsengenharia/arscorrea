# ARS Engenharia — Roteiro de Teste Fases 3 e 4

**Data:** 2026-03-26
**Branch:** `redesign`
**URL local:** http://localhost:5173
**Pré-requisito:** Fases 1-2 testadas e funcionando. Dados de teste das fases anteriores (contas bancárias, categorias, lançamentos) já existem.

---

## Credenciais

| Campo | Valor |
|---|---|
| URL de login | http://localhost:5173/auth |
| Email | falecompedrosilveira@gmail.com |
| Senha | Sucesso23! |

---

## Teste 1: Navegação — Novas Tabs

**Objetivo:** Verificar que as 4 tabs do módulo financeiro estão presentes.

| # | Ação | Resultado Esperado |
|---|---|---|
| 1.1 | Clicar "Financeiro" no menu principal | Navega para `/financeiro/categorias` |
| 1.2 | Verificar barra de tabs | 4 tabs visíveis: **Categorias** \| **Contas Bancárias** \| **Conciliação** \| **Rateio** |
| 1.3 | Clicar tab "Conciliação" | Navega para `/financeiro/conciliacao` |
| 1.4 | Clicar tab "Rateio" | Navega para `/financeiro/rateio` |
| 1.5 | Tab ativa destaca com borda inferior colorida | Cor primária na tab selecionada |

**Critério de aceite:** Todas as 4 tabs navegam corretamente. Tab ativa é visualmente distinta.

---

## FASE 3 — Conciliação Bancária

### Teste 2: Página de Conciliação — Estado Inicial

**Rota:** `/financeiro/conciliacao`

| # | Ação | Resultado Esperado |
|---|---|---|
| 2.1 | Acessar `/financeiro/conciliacao` | Página carrega com título "Financeiro" + tabs + área de import |
| 2.2 | Verificar select de conta bancária | Dropdown lista as contas criadas na Fase 1 (Banco Inter, Bradesco) |
| 2.3 | Sem conta selecionada, tabela de transações | Vazia ou mensagem "Selecione uma conta" |

**Critério de aceite:** Página carrega sem erros. Contas bancárias aparecem no dropdown.

---

### Teste 3: Importação de Extrato CSV

**Rota:** `/financeiro/conciliacao`

**Pré-requisito:** Criar o arquivo CSV de teste abaixo antes de executar.

#### Arquivo CSV de teste (`extrato-teste.csv`)

```csv
Data;Descrição;Valor;Tipo
10/03/2026;PIX RECEBIDO - CLIENTE JOAO;25000,00;Crédito em Conta Corrente
15/03/2026;PIX ENVIADO - FORNECEDOR CIMENTO;-5000,00;Débito em Conta Corrente
20/03/2026;TED ENVIADA - PEDREIRO MARCO;-8000,00;Débito em Conta Corrente
22/03/2026;PIX RECEBIDO - CLIENTE MARIA;15000,00;Crédito em Conta Corrente
25/03/2026;TARIFA BANCARIA;-29,90;Débito em Conta Corrente
```

| # | Ação | Resultado Esperado |
|---|---|---|
| 3.1 | Selecionar "Banco Inter" no dropdown | Conta selecionada |
| 3.2 | Clicar no input de arquivo e selecionar `extrato-teste.csv` | Arquivo selecionado (nome aparece) |
| 3.3 | Clicar "Importar Extrato" | Botão mostra loading/spinner durante processamento |
| 3.4 | Aguardar resposta | Toast exibido: "X transações importadas, Y conciliadas automaticamente, Z pendentes" |
| 3.5 | Verificar tabela de transações | 5 linhas importadas aparecem |
| 3.6 | Verificar colunas da tabela | Data (dd/mm/yyyy), Descrição, Valor (verde/vermelho), Status (badges), Match |

**Resultados esperados de auto-match:**

Se existirem lançamentos da Fase 1-2 com valores e datas similares (ex: R$ 25.000 em 10/03, R$ -5.000 em 15/03), esses devem ser auto-conciliados. Os demais ficam como "pendente".

| Transação | Valor | Status Esperado |
|---|---|---|
| PIX RECEBIDO - CLIENTE JOAO | R$ 25.000,00 | Conciliado (se existir lançamento ~R$ 25k em ~10/03) ou Pendente |
| PIX ENVIADO - FORNECEDOR CIMENTO | -R$ 5.000,00 | Conciliado (se existir lançamento ~-R$ 5k em ~15/03) ou Pendente |
| TED ENVIADA - PEDREIRO MARCO | -R$ 8.000,00 | Conciliado ou Pendente |
| PIX RECEBIDO - CLIENTE MARIA | R$ 15.000,00 | Pendente (provavelmente sem match) |
| TARIFA BANCARIA | -R$ 29,90 | Pendente (sem match) |

**Critério de aceite:** CSV importado sem erros. Transações visíveis na tabela. Auto-match executado (pode ter 0 matches se dados não coincidem — isso é OK).

---

### Teste 4: Match Manual

**Rota:** `/financeiro/conciliacao`

**Pré-requisito:** Ter transações pendentes da importação do Teste 3.

| # | Ação | Resultado Esperado |
|---|---|---|
| 4.1 | Encontrar uma transação com status "Pendente" | Badge outline "Pendente" visível |
| 4.2 | Clicar botão "Vincular" na coluna Match | Dialog de match manual abre |
| 4.3 | Verificar detalhes da transação no dialog | Data, descrição e valor exibidos |
| 4.4 | Verificar lista de lançamentos pendentes | Tabela com entries do mesmo banco, situacao='pendente' |
| 4.5 | Verificar sugestões | Lançamentos com valor próximo (diferença < R$ 100) aparecem destacados como "Sugerido" |
| 4.6 | Clicar "Vincular" em um lançamento | Toast de sucesso, dialog fecha |
| 4.7 | Verificar status atualizado | Transação muda para "Conciliado" com badge "Manual" |

**Critério de aceite:** Match manual funciona. Status atualizado em tempo real. Lançamento vinculado (entry.situacao → 'conciliado').

---

### Teste 5: Marcar como Não Identificado

**Rota:** `/financeiro/conciliacao`

| # | Ação | Resultado Esperado |
|---|---|---|
| 5.1 | Encontrar transação pendente (ex: TARIFA BANCARIA -R$ 29,90) | Transação com status Pendente |
| 5.2 | Clicar ícone de alerta (AlertCircle) na linha | — |
| 5.3 | Verificar status atualizado | Status muda para badge vermelho "Não Identificado" |

**Critério de aceite:** Transação marcada como `nao_identificado`. Badge vermelho exibido.

---

## FASE 4 — Rateio de Custos Indiretos

### Teste 6: Página de Rateio — Estado Inicial

**Rota:** `/financeiro/rateio`

**Pré-requisito:** Ter pelo menos 1 lançamento com categoria ADM. Se não existir, criar um na tela de Lançamentos de qualquer obra:
- Categoria: [ADM] Custo Administrativo (indireto)
- Valor: -1200.00
- Descrição: "Combustível março"

| # | Ação | Resultado Esperado |
|---|---|---|
| 6.1 | Acessar `/financeiro/rateio` | Página carrega com título + tabs |
| 6.2 | Verificar tabela de lançamentos ADM | Lista lançamentos com prefixo ADM |
| 6.3 | Verificar colunas | Data, Descrição, Valor (vermelho, BRL), botão "Ratear" |
| 6.4 | Se não houver lançamentos ADM | Mensagem "Nenhum lançamento ADM encontrado" |

**Critério de aceite:** Página carrega. Lançamentos ADM listados (ou mensagem vazia).

---

### Teste 7: Rateio — Método Igualitário

**Pré-requisito:** Criar lançamento ADM se necessário (ver Teste 6). Ter pelo menos 2 obras ativas.

| # | Ação | Resultado Esperado |
|---|---|---|
| 7.1 | Clicar "Ratear" em um lançamento ADM (ex: -R$ 1.200,00) | Dialog de rateio abre |
| 7.2 | Verificar detalhes do lançamento no topo | Data, descrição, valor exibidos |
| 7.3 | Verificar seletor de método | 3 opções: Igualitário, Proporcional ao contrato, Manual |
| 7.4 | Selecionar "Igualitário" | — |
| 7.5 | Marcar 2 obras na tabela (checkboxes) | Checkboxes marcados |
| 7.6 | Verificar auto-cálculo | Cada obra recebe 50%, valor = -R$ 600,00 |
| 7.7 | Marcar 3ª obra | Recalcula: ~33.33% cada, valor = -R$ 400,00 cada |
| 7.8 | Verificar linha de totais | Soma = 100%, valor total = -R$ 1.200,00 |
| 7.9 | Clicar "Confirmar Rateio" | Toast de sucesso, dialog fecha |

**Critério de aceite:** Divisão igualitária calcula corretamente. Totais somam 100%. Rateio salvo no banco.

---

### Teste 8: Rateio — Método Proporcional

| # | Ação | Resultado Esperado |
|---|---|---|
| 8.1 | Clicar "Ratear" em um lançamento ADM | Dialog abre |
| 8.2 | Selecionar "Proporcional ao contrato" | — |
| 8.3 | Marcar 2+ obras com orçamento previsto diferente | — |
| 8.4 | Verificar percentuais calculados | Obra com maior orçamento recebe maior % |
| 8.5 | Verificar totais | Soma = 100% |

**Nota:** Se as obras não têm `orcamento_previsto` preenchido, os valores podem dar 0% ou NaN. Nesse caso, preencher orçamento nas obras primeiro (via `/obras/nova` ou edição).

**Valores de exemplo:**
- Obra A: orçamento R$ 100.000 → 66.67%
- Obra B: orçamento R$ 50.000 → 33.33%
- Total: 100%

**Critério de aceite:** Proporção calculada com base no orçamento previsto de cada obra.

---

### Teste 9: Rateio — Método Manual

| # | Ação | Resultado Esperado |
|---|---|---|
| 9.1 | Clicar "Ratear" em um lançamento ADM | Dialog abre |
| 9.2 | Selecionar "Manual" | Campos de percentual ficam editáveis |
| 9.3 | Marcar 2 obras | — |
| 9.4 | Digitar 70% na primeira e 30% na segunda | Valores alocados calculam automaticamente |
| 9.5 | Verificar totais | 100% / valor total correto |
| 9.6 | Tentar confirmar com total != 100% (ex: 70% + 20% = 90%) | Botão desabilitado ou validação impede |
| 9.7 | Corrigir para 100% e confirmar | Toast sucesso |

**Critério de aceite:** Inputs editáveis no modo manual. Validação de 100%. Rateio salvo.

---

### Teste 10: Histórico de Rateios

**Rota:** `/financeiro/rateio`

**Pré-requisito:** Ter executado pelo menos 1 rateio nos testes anteriores.

| # | Ação | Resultado Esperado |
|---|---|---|
| 10.1 | Verificar seção "Histórico de Rateios" | Seção visível (pode ser colapsável) |
| 10.2 | Verificar colunas | Data Rateio, Lançamento (descrição), Obra (nome), %, Valor Alocado |
| 10.3 | Verificar dados | Rateios dos testes anteriores aparecem |
| 10.4 | Valores formatados em BRL | Sim |

**Critério de aceite:** Histórico lista rateios realizados com dados corretos.

---

## Teste 11: PDF Financeiro por Obra

**Rota:** `/obras/:projectId/financeiro`

**Pré-requisito:** Obra com lançamentos (da Fase 1-2).

| # | Ação | Resultado Esperado |
|---|---|---|
| 11.1 | Acessar dashboard financeiro de uma obra | Página carrega com cards e gráficos |
| 11.2 | Verificar botão "Exportar PDF" | Botão visível no header, ao lado de "Ver Lançamentos" |
| 11.3 | Clicar "Exportar PDF" | Botão mostra "Gerando PDF..." brevemente |
| 11.4 | Verificar download | Arquivo PDF baixado com nome `financeiro-{nome-obra}-2026-03-26.pdf` |
| 11.5 | Abrir PDF — Página 1 | Header "ARS Engenharia — Relatório Financeiro", nome da obra, tabela de métricas (Recebido, Gasto, Saldo, Margem, IEC, Orçamento) |
| 11.6 | Abrir PDF — Página 2 | "Extrato Financeiro" com tabela de todos os lançamentos (Data, Categoria, Fornecedor, Tipo, Valor) |
| 11.7 | Abrir PDF — Página 3 | "Top Fornecedores" (se existirem lançamentos com fornecedor) |
| 11.8 | Valores no PDF batem com o dashboard | Comparar cards do dashboard com tabela de métricas do PDF |

**Critério de aceite:** PDF gerado e baixado. 2-3 páginas com dados corretos. Formatação profissional (header azul, tabelas organizadas).

---

## Teste 12: Integração — Fluxo Completo

**Objetivo:** Verificar que o fluxo end-to-end funciona.

| # | Ação | Resultado Esperado |
|---|---|---|
| 12.1 | Criar lançamento ADM em uma obra (-R$ 500, "Internet escritório") | Lançamento criado |
| 12.2 | Ir para `/financeiro/rateio` | Lançamento ADM aparece na lista |
| 12.3 | Ratear igualitariamente entre 2 obras | Rateio salvo |
| 12.4 | Verificar dashboard financeiro de cada obra | Saldo atualizado (custo indireto refletido) |
| 12.5 | Importar CSV na conciliação | Transações importadas |
| 12.6 | Match manual de 1 transação | Conciliação OK |
| 12.7 | Exportar PDF da obra | PDF reflete dados atualizados |

**Critério de aceite:** Dados fluem corretamente entre lançamentos → rateio → dashboard → PDF.

---

## Resumo de Rotas Testadas

| Rota | Página | Fase |
|---|---|---|
| `/financeiro/conciliacao` | Conciliação Bancária | **Fase 3 — NOVA** |
| `/financeiro/rateio` | Rateio de Custos Indiretos | **Fase 4 — NOVA** |
| `/obras/:id/financeiro` | Dashboard + botão PDF | **Fase 4 — ATUALIZADA** |

---

## Bugs Conhecidos / Limitações

1. **Edge function `import-bank-statement`** precisa ser deployed no Supabase (`supabase functions deploy import-bank-statement`). Sem deploy, a importação CSV não funciona — o botão vai retornar erro.
2. **Formato CSV** é específico para Banco Inter (separador `;`, formato brasileiro de data e valores). Outros bancos podem precisar de adaptação.
3. **Rateio proporcional** requer que as obras tenham `orcamento_previsto` preenchido. Obras sem orçamento resultam em 0% (divisão por zero protegida).
4. **PDF** usa `@react-pdf/renderer` que roda client-side — pode ser lento para obras com centenas de lançamentos.
5. **Tabelas novas** ainda usam `as any` no TypeScript — rodar `supabase gen types` após estabilizar schema para tipagem completa.
