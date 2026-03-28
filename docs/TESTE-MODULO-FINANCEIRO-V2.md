# ARS Engenharia — Roteiro de Teste do Modulo Financeiro v2

**Data:** 2026-03-26
**Branch:** `redesign`
**URL local:** http://localhost:5173
**URL Supabase:** https://qajzskxuvxsbvuyuvlnd.supabase.co

---

## Credenciais

| Campo | Valor |
|---|---|
| URL de login | http://localhost:5173/auth |
| Email | falecompedrosilveira@gmail.com |
| Senha | Sucesso23! |

---

## Pré-requisitos

- Dev server rodando (`npm run dev` ou `npx vite --host` no diretório `/tmp/arscorrea`)
- Migrations já aplicadas no Supabase (7 migrations do módulo financeiro)
- Usuário acima tem role `admin` no sistema

---

## Teste 1: Login e Navegação Geral

**Objetivo:** Verificar que o login funciona e os novos itens de menu aparecem.

| # | Ação | Resultado Esperado |
|---|---|---|
| 1.1 | Acessar http://localhost:5173/auth | Página de login carrega |
| 1.2 | Inserir email `falecompedrosilveira@gmail.com` e senha `Sucesso23!` | Login bem-sucedido, redireciona para Dashboard |
| 1.3 | Verificar sidebar (menu lateral) | Deve conter na ordem: Dashboard, Clientes, Obras, Propostas, **Contratos**, **Financeiro**, Agenda, Fornecedores |
| 1.4 | Clicar em "Financeiro" na sidebar | Navega para `/financeiro/categorias` |

**Critério de aceite:** Sidebar mostra todos os itens, incluindo Contratos e Financeiro.

---

## Teste 2: Categorias Financeiras

**Rota:** `/financeiro/categorias`

| # | Ação | Resultado Esperado |
|---|---|---|
| 2.1 | Acessar `/financeiro/categorias` | Tabela com 8 categorias pré-cadastradas |
| 2.2 | Verificar categorias listadas | Ver tabela abaixo |
| 2.3 | Clicar no botão de edição (lápis) de "Mão de Obra Direta" | Abre dialog com dados preenchidos |
| 2.4 | Alterar o nome para "Mão de Obra Direta (CLT)" e salvar | Toast "Categoria atualizada!", tabela atualiza |
| 2.5 | Clicar "Nova Categoria" | Abre dialog vazio |
| 2.6 | Preencher: Nome="Teste Bot", Prefixo=CV, Cor=#FF0000, É receita=desligado, Ativo=ligado | — |
| 2.7 | Clicar "Criar" | Toast "Categoria criada!", aparece na tabela |
| 2.8 | Editar "Teste Bot", desligar "Ativo", salvar | Status muda para "Inativo" na tabela |
| 2.9 | Reverter nome "Mão de Obra Direta (CLT)" para "Mão de Obra Direta" | Restaura nome original |

### Categorias esperadas (seed)

| Prefixo | Nome | Tipo |
|---|---|---|
| ADM | Custo Administrativo (indireto) | Saída |
| CV | Equipamentos e Ferramentas | Saída |
| CV | Materiais de Obra | Saída |
| CV | Mão de Obra Direta | Saída |
| CV | Reembolsos e Outras Despesas de Obras | Saída |
| CV | Serviços Prestados | Saída |
| ROP | Aporte de Clientes | Entrada |
| ROP | Serviços Prestados (receita) | Entrada |

**Critério de aceite:** CRUD completo funciona. 8 categorias seed visíveis. Cores exibidas como círculos coloridos.

---

## Teste 3: Contas Bancárias

**Rota:** `/financeiro/contas`

| # | Ação | Resultado Esperado |
|---|---|---|
| 3.1 | Acessar `/financeiro/contas` | Tabela vazia ("Nenhuma conta cadastrada") |
| 3.2 | Clicar "Nova Conta" | Abre dialog de formulário |
| 3.3 | Preencher conforme dados abaixo e clicar "Criar" | Toast "Conta criada!", conta aparece na tabela |
| 3.4 | Verificar dados na tabela | Banco, agência, conta, apelido, saldo (R$), data, status |
| 3.5 | Clicar editar, mudar apelido para "Conta Principal ARS" | Toast "Conta atualizada!" |
| 3.6 | Criar segunda conta conforme dados abaixo | Duas contas na tabela |

### Conta 1 — Banco Inter

| Campo | Valor |
|---|---|
| Banco | Banco Inter |
| Agência | 0001 |
| Conta | 12345-6 |
| Apelido | Conta Obras |
| Saldo Inicial | 50000.00 |
| Data do Saldo | 2026-03-01 |
| Ativo | Sim |

### Conta 2 — Bradesco

| Campo | Valor |
|---|---|
| Banco | Bradesco |
| Agência | 1234 |
| Conta | 98765-0 |
| Apelido | Conta Administrativa |
| Saldo Inicial | 10000.00 |
| Data do Saldo | 2026-03-01 |
| Ativo | Sim |

**Critério de aceite:** Duas contas bancárias criadas e visíveis com formatação correta de valores em BRL.

---

## Teste 4: Fornecedores — Campos v2

**Rota:** `/fornecedores`

| # | Ação | Resultado Esperado |
|---|---|---|
| 4.1 | Acessar `/fornecedores` | Lista de fornecedores carrega |
| 4.2 | Clicar "Novo Fornecedor" | Dialog abre |
| 4.3 | Verificar campos novos no formulário | Deve ter: Tipo (select), Categoria Padrão (select), Chave Pix (input) |
| 4.4 | Preencher conforme dados abaixo e clicar "Cadastrar" | Fornecedor criado |
| 4.5 | Editar o fornecedor criado | Dialog abre com todos os campos preenchidos, incluindo os novos |

### Fornecedor de teste

| Campo | Valor |
|---|---|
| Nome Fantasia | Fornecedor Teste Bot |
| Razão Social | Teste Bot Ltda |
| CNPJ | 12.345.678/0001-90 |
| Tipo | Jurídica |
| Categoria Padrão | [CV] Materiais de Obra |
| Chave Pix | 12345678000190 |
| Contato | João Silva |
| Telefone | (31) 99999-0000 |
| Email | teste@bot.com |

**Critério de aceite:** Campos v2 (Tipo, Categoria Padrão, Chave Pix) aparecem no formulário e salvam corretamente.

---

## Teste 5: Obras — Campos v2

**Rota:** `/obras/nova` ou editar obra existente

| # | Ação | Resultado Esperado |
|---|---|---|
| 5.1 | Acessar `/obras` | Lista de obras carrega |
| 5.2 | Clicar "Nova Obra" ou editar uma existente | Formulário de obra abre |
| 5.3 | Verificar campos novos | Deve ter: "Conta Bancária" (select com contas criadas no Teste 3) e "Orçamento Previsto (R$)" (input numérico) |
| 5.4 | Selecionar "Banco Inter - 12345-6" como conta bancária | Select popula corretamente |
| 5.5 | Preencher orçamento previsto: 150000.00 | Campo aceita valor numérico |

**Critério de aceite:** Campos v2 visíveis e funcionais no formulário de obra.

---

## Teste 6: Lançamentos Financeiros

**Rota:** `/obras/:projectId/lancamentos`

**Pré-requisito:** Ter pelo menos 1 obra cadastrada. Usar uma obra existente.

| # | Ação | Resultado Esperado |
|---|---|---|
| 6.1 | Acessar detalhes de uma obra (clicar em uma obra na lista) | Página de detalhes abre |
| 6.2 | Verificar barra de ações | Deve ter botões "Financeiro" e "Lançamentos" (em vez de "Receitas" e "Custos") |
| 6.3 | Clicar "Lançamentos" | Navega para `/obras/:id/lancamentos`, tabela vazia |
| 6.4 | Clicar "Novo Lançamento" | Dialog de formulário abre |
| 6.5 | Verificar campos do formulário | Conta Bancária, Categoria, Fornecedor, Data, Valor, Tipo Documento, Nº Documento, Nota Fiscal, Observações, Comprometido, Situação |
| 6.6 | Registrar SAÍDA conforme Lançamento 1 abaixo | Toast "Lançamento registrado!", aparece na tabela |
| 6.7 | Registrar SAÍDA conforme Lançamento 2 abaixo | Segundo lançamento na tabela |
| 6.8 | Registrar ENTRADA conforme Lançamento 3 abaixo | Terceiro lançamento, valor em verde |
| 6.9 | Verificar formatação na tabela | Valores negativos em vermelho, positivos em verde. Datas no formato dd/mm/yyyy. Categorias com círculo colorido + prefixo. |
| 6.10 | Editar Lançamento 1 (clicar lápis) | Dialog abre com dados preenchidos |
| 6.11 | Alterar observações para "Editado pelo bot" e salvar | Toast "Lançamento atualizado!" |
| 6.12 | Excluir Lançamento 2 (clicar lixeira) | Dialog de confirmação aparece |
| 6.13 | Confirmar exclusão | Toast "Lançamento excluído", item some da tabela |

### Lançamento 1 — Saída (custo de material)

| Campo | Valor |
|---|---|
| Conta Bancária | Banco Inter - 12345-6 |
| Categoria | [CV] Materiais de Obra |
| Fornecedor | Fornecedor Teste Bot (do Teste 4) |
| Data | 2026-03-15 |
| Valor | -5000.00 |
| Tipo Documento | Pix |
| Nº Documento | PIX-001 |
| Nota Fiscal | NF-12345 |
| Observações | Compra de cimento e areia |
| Comprometido | Não |
| Situação | Pendente |

### Lançamento 2 — Saída (mão de obra)

| Campo | Valor |
|---|---|
| Conta Bancária | Banco Inter - 12345-6 |
| Categoria | [CV] Mão de Obra Direta |
| Fornecedor | (nenhum) |
| Data | 2026-03-20 |
| Valor | -8000.00 |
| Tipo Documento | Transferência |
| Nº Documento | TED-002 |
| Observações | Pagamento pedreiro março |
| Comprometido | Não |
| Situação | Pendente |

### Lançamento 3 — Entrada (aporte do cliente)

| Campo | Valor |
|---|---|
| Conta Bancária | Banco Inter - 12345-6 |
| Categoria | [ROP] Aporte de Clientes |
| Fornecedor | (nenhum) |
| Data | 2026-03-10 |
| Valor | 25000.00 |
| Tipo Documento | Pix |
| Nº Documento | PIX-CLIENTE-001 |
| Observações | 1ª parcela do contrato |
| Comprometido | Não |
| Situação | Conciliado |

**Critério de aceite:** CRUD completo de lançamentos funciona. Valores positivos/negativos formatados com cores. Após cada operação (criar/editar/excluir), o saldo da obra é recalculado automaticamente via `calc_project_balance`.

---

## Teste 7: Dashboard Financeiro por Obra

**Rota:** `/obras/:projectId/financeiro`

**Pré-requisito:** Ter pelo menos 2 lançamentos na obra (após Teste 6, devem restar Lançamento 1 e 3).

| # | Ação | Resultado Esperado |
|---|---|---|
| 7.1 | Na página de detalhes da obra, clicar "Financeiro" | Navega para `/obras/:id/financeiro` |
| 7.2 | Verificar título | "Dashboard Financeiro" + nome da obra |
| 7.3 | Verificar cards de resumo (4 cards) | Ver tabela de valores esperados abaixo |
| 7.4 | Verificar alertas | Pode ter badge amarelo "N lançamento(s) não conciliado(s)" |
| 7.5 | Verificar gráfico "Custo por Categoria por Mês" | Barras empilhadas com cores das categorias |
| 7.6 | Verificar gráfico "Curva S Financeira" | Duas linhas: Receita Acumulada (verde) e Custo Acumulado (vermelho) |
| 7.7 | Verificar gráfico "Distribuição de Custos" | Pizza com fatias por categoria |
| 7.8 | Verificar tabela "Top Fornecedores" | Lista ranqueada de fornecedores por valor gasto |
| 7.9 | Clicar "Ver Lançamentos" | Navega para `/obras/:id/lancamentos` |

### Valores esperados nos cards (após Teste 6, com Lançamentos 1 e 3 restantes)

| Card | Valor Esperado | Observação |
|---|---|---|
| Total Recebido | R$ 25.000,00 | Lançamento 3 (entrada) |
| Total Gasto | R$ 5.000,00 | Lançamento 1 (saída, valor absoluto) |
| Saldo da Obra | R$ 20.000,00 | 25000 - 5000 |
| Margem Bruta | 80.0% | (20000 / 25000) * 100 |

**Nota:** Se o Lançamento 2 não foi excluído no Teste 6.13, os valores serão diferentes:
- Total Gasto: R$ 13.000,00
- Saldo: R$ 12.000,00
- Margem: 48.0%

**Critério de aceite:** 4 cards exibem valores corretos. Pelo menos 2 dos 3 gráficos renderizam com dados. Tabela de fornecedores mostra ranking.

---

## Teste 8: Alertas Automáticos

**Rota:** `/obras/:projectId/financeiro`

| # | Ação | Resultado Esperado |
|---|---|---|
| 8.1 | Na obra com lançamentos, verificar se há badge amarelo | "N lançamento(s) não conciliado(s)" se existirem lançamentos com situação "pendente" |
| 8.2 | Criar lançamentos de saída suficientes para saldo ficar negativo | Badge vermelho "Saldo negativo" aparece |
| 8.3 | Se a obra tem orçamento previsto e custo > orçamento | Badge laranja "IEC X.XXX — acima do orçamento" |

**Critério de aceite:** Alertas aparecem dinamicamente conforme condições financeiras da obra.

---

## Teste 9: Navegação entre páginas

| # | Ação | Resultado Esperado |
|---|---|---|
| 9.1 | Dashboard → Financeiro (sidebar) | `/financeiro/categorias` carrega |
| 9.2 | Categorias → Contas (navegar manualmente para `/financeiro/contas`) | Página de contas carrega |
| 9.3 | Obras → Detalhe da obra → Lançamentos → Voltar (botão ←) | Retorna para detalhe da obra |
| 9.4 | Obras → Detalhe da obra → Financeiro → Ver Lançamentos | Navega corretamente |
| 9.5 | URL direta: `/financeiro/categorias` | Carrega (se logado) ou redireciona para login |
| 9.6 | URL direta: `/financeiro/contas` | Carrega corretamente |

**Critério de aceite:** Todas as navegações funcionam sem erros 404 ou tela branca.

---

## Teste 10: Responsividade e Edge Cases

| # | Ação | Resultado Esperado |
|---|---|---|
| 10.1 | Reduzir largura do browser para mobile (~375px) | Tabelas têm scroll horizontal, formulários empilham verticalmente |
| 10.2 | Criar lançamento com valor 0 | Validação impede: "Valor não pode ser zero" |
| 10.3 | Criar lançamento sem conta bancária | Validação impede: "Selecione uma conta" |
| 10.4 | Criar lançamento sem categoria | Validação impede: "Selecione uma categoria" |
| 10.5 | Criar categoria com cor inválida (ex: "abc") | Validação impede: "Cor hex inválida" |
| 10.6 | Criar conta bancária sem data do saldo | Validação impede: "Data é obrigatória" |

**Critério de aceite:** Validações Zod funcionam corretamente. Nenhum crash em edge cases.

---

## Resumo de Rotas Testadas

| Rota | Página | Status |
|---|---|---|
| `/auth` | Login | Existente |
| `/financeiro/categorias` | CRUD Categorias | **NOVA** |
| `/financeiro/contas` | CRUD Contas Bancárias | **NOVA** |
| `/obras/:id/lancamentos` | Lançamentos por Obra | **NOVA** |
| `/obras/:id/financeiro` | Dashboard Financeiro | **NOVA** |
| `/fornecedores` | Fornecedores (com campos v2) | **ATUALIZADA** |
| `/obras/nova` | Nova Obra (com campos v2) | **ATUALIZADA** |
| `/obras/:id` | Detalhe da Obra (botões atualizados) | **ATUALIZADA** |

---

## Dados de Limpeza (pós-teste)

Após os testes, os seguintes dados de teste podem ser removidos:
- Categoria "Teste Bot" (criada no Teste 2.7)
- Fornecedor "Fornecedor Teste Bot" (criado no Teste 4.4)
- Lançamentos de teste (criados no Teste 6)
- As 2 contas bancárias podem ser mantidas (serão usadas em produção)

---

## Bugs Conhecidos / Limitações

1. As tabelas `financial_categories`, `bank_accounts`, `project_financial_entries` ainda não estão no arquivo `types.ts` gerado pelo Supabase — por isso o código usa `as any` nos acessos. Isso será resolvido ao rodar `supabase gen types` após estabilizar o schema.
2. O upload de comprovante (campo `arquivo_anexo` do spec) ainda não está implementado — será adicionado junto com a fase de conciliação bancária.
3. A página `/financeiro/contas` não tem link direto na navegação — acessa-se via sidebar "Financeiro" (que vai para categorias) e depois manualmente. Uma sub-navegação com tabs será adicionada.
