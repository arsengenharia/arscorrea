# Analise de Gaps: Sistema Atual (v2) vs. Modulo NF-e (v3)

**Data:** 2026-03-26
**Branch analisada:** `redesign`
**Autor:** Arquitetura de Software

---

## 1. Gaps no Schema do Banco de Dados

### 1.1 Tabela `nfe_inbox` -- NAO EXISTE

A spec v3 assume uma tabela `nfe_inbox` para fila de aprovacao. Esta tabela nao existe e precisa ser criada. Colunas necessarias (conforme spec):

- `id` uuid PK
- `chave_nfe` text UNIQUE (para deduplicacao)
- `xml_url` text (arquivo XML no storage)
- `email_remetente` text
- `data_recepcao` timestamptz
- `status` text (pendente, aprovado, rejeitado, erro)
- `dados_parseados` jsonb (resultado do parse do XML)
- `categoria_sugerida_id` uuid FK -> financial_categories
- `projeto_sugerido_id` uuid FK -> projects
- `supplier_id` uuid FK -> suppliers
- `lancamento_id` uuid FK -> project_financial_entries (preenchido apos aprovacao)
- `erro_mensagem` text
- `aprovado_por` uuid FK -> profiles
- `aprovado_em` timestamptz

**Acao:** Criar migration para `nfe_inbox`.

### 1.2 Campo `suppliers.cpf_cnpj` -- NAO EXISTE (nome errado na spec)

A spec v3 referencia `suppliers.cpf_cnpj` em multiplos pontos:

```typescript
// v3 spec faz isso:
.eq('cpf_cnpj', cnpj_emitente)
```

**O campo real chama-se `suppliers.document`** (definido na migration `20260210223221`). Este e o gap mais critico -- se o codigo v3 for implementado literalmente, toda busca de fornecedor por CNPJ vai falhar.

**Acao:** A spec v3 deve usar `document` em vez de `cpf_cnpj`. NAO renomear a coluna existente -- isso quebraria todo o frontend. Corrigir a spec.

### 1.3 Campo `suppliers.document` -- SEM constraint UNIQUE

A auto-criacao de fornecedor no v3 faz:

```typescript
const { data: existingSupplier } = await supabase
  .from('suppliers')
  .select('id')
  .eq('cpf_cnpj', cnpj) // campo errado, mas alem disso:
  .single();
```

Se nao encontrar, cria um novo. **Problema:** sem UNIQUE em `document`, nada impede duplicatas se duas NF-e do mesmo CNPJ chegarem simultaneamente (race condition). O `select + insert` nao e atomico.

**Acao:** Adicionar `UNIQUE` em `suppliers.document` (parcial, apenas quando `document IS NOT NULL`):

```sql
CREATE UNIQUE INDEX idx_suppliers_document_unique
  ON suppliers(document) WHERE document IS NOT NULL;
```

### 1.4 Mapeamento de campos do Fornecedor (XML -> DB)

A spec v3 faz auto-criacao com este mapeamento:

| Campo no XML (NF-e) | Campo na spec v3 | Campo REAL no DB | Status |
|---|---|---|---|
| `emit.xFant` ou `emit.xNome` | `nome_fantasia` | `trade_name` | NOME ERRADO |
| `emit.xNome` | `razao_social` | `legal_name` | NOME ERRADO |
| `emit.CNPJ` | `cpf_cnpj` | `document` | NOME ERRADO |
| `enderEmit.xMun` | `cidade` | `cidade` | OK |
| `enderEmit.UF` | `estado` | `estado` | OK |
| `enderEmit.xLgr` | `rua` | `rua` | OK (adicionado em migration `20260327000100`) |
| `enderEmit.nro` | `numero` | `numero` | OK |
| `enderEmit.xBairro` | `bairro` | `bairro` | OK |
| `enderEmit.CEP` | `cep` | `cep` | OK |
| `emit.fone` | `telefone` | `phone` | NOME ERRADO |
| -- | `tipo` | `tipo` | Precisa setar 'Juridica' automaticamente |

**Acao:** O codigo da edge function `receive-nfe-email` deve usar os nomes de coluna REAIS (`trade_name`, `legal_name`, `document`, `phone`), e setar `tipo = 'Juridica'` para fornecedores criados via NF-e (toda NF-e tem CNPJ de pessoa juridica).

### 1.5 `chave_nfe` em `project_financial_entries` -- JA EXISTE

**Bom planejamento na v2.** A coluna `chave_nfe text UNIQUE` ja existe na tabela `project_financial_entries` (migration `20260326000300`). Isso permite vincular o lancamento a NF-e original sem duplicacao.

**Status:** Pronto. Nenhuma mudanca necessaria.

### 1.6 `tipo_documento` CHECK constraint -- JA INCLUI 'NF-e'

O CHECK constraint ja permite o valor `'NF-e'`:

```sql
CHECK (tipo_documento IN ('Pix', 'Boleto', 'Transferencia', 'Dinheiro', 'Outros', 'NF-e'))
```

**Status:** Pronto. Nenhuma mudanca necessaria.

### 1.7 Supabase Generated Types (`types.ts`) -- DESATUALIZADO

O arquivo `/tmp/arscorrea/src/integrations/supabase/types.ts` NAO contem as tabelas v2 (`financial_categories`, `bank_accounts`, `project_financial_entries`, `bank_transactions`, `bank_reconciliations`, `cost_allocations`). O frontend usa `as any` para contornar isso (mencionado na propria doc de teste, linha 279).

Para o v3 funcionar com tipagem correta, `supabase gen types` precisa ser executado.

**Acao:** Executar `supabase gen types typescript --project-id qajzskxuvxsbvuyuvlnd > src/integrations/supabase/types.ts` ANTES de implementar v3.

### 1.8 Storage Bucket para XMLs de NF-e -- NAO EXISTE

A spec v3 armazena XMLs no Supabase Storage. Nao existe bucket configurado para isso.

**Acao:** Criar bucket `nfe-xml` (privado) no Supabase Storage com politica RLS para admin/financeiro.

---

## 2. Preocupacoes com Auto-Criacao de Fornecedores

### 2.1 Race Condition na Deduplicacao

Sem `UNIQUE` em `suppliers.document`, duas NF-e do mesmo emitente processadas simultaneamente podem criar dois fornecedores duplicados. O fluxo `SELECT -> not found -> INSERT` nao e atomico.

**Recomendacao:** Alem do indice UNIQUE parcial, usar `INSERT ... ON CONFLICT (document) DO NOTHING RETURNING id` ou verificar apos o insert.

### 2.2 Qualidade dos Dados

Fornecedores criados automaticamente terao dados minimos vindos do XML. Campos que nao existem no XML:
- `contact_name` -- ficara NULL
- `email` -- NF-e nao tem email do emitente
- `chave_pix` -- nao vem do XML
- `categoria_padrao_id` -- nao vem do XML (mas a IA pode sugerir)
- `observacoes` -- deve ser preenchido com "Criado automaticamente via NF-e"

**Recomendacao:** Marcar fornecedores auto-criados com um campo ou tag, para que o usuario saiba que precisa completar o cadastro. Opcao simples: `observacoes = 'Cadastro automatico via NF-e - completar dados'`.

### 2.3 Mesmo CNPJ, Nomes Diferentes

Empresas mudam nome fantasia. Uma NF-e antiga pode ter `xFant = "Cimento ABC"` e uma nova `xFant = "ABC Materiais"`. Se o fornecedor ja existe pelo CNPJ, a spec v3 nao atualiza o nome -- apenas reutiliza o `id`.

**Recomendacao:** Manter o comportamento de nao atualizar (o cadastro manual e mais confiavel), mas logar a divergencia no `nfe_inbox.dados_parseados` para auditoria.

### 2.4 Campo `address` Original

A tabela `suppliers` originalmente tinha uma coluna `address` (TEXT) da migration `20260210223221`. Na v2, as colunas de endereco granular (`cep`, `rua`, `numero`, etc.) foram adicionadas via `20260327000100`. A coluna `address` AINDA EXISTE no schema e no `types.ts`.

**Risco:** Auto-criacao via NF-e preenche os campos granulares mas ignora `address`. Nao e um problema funcional, mas e inconsistencia. Fornecedores antigos podem ter dados em `address` e nao nos campos granulares.

**Recomendacao:** Eventual migration para migrar dados de `address` para campos granulares e depreciar a coluna.

---

## 3. Preocupacoes com Match de Categoria

### 3.1 Match por Nome e FRAGIL

A spec v3 faz:

```typescript
const { data: cat } = await supabase
  .from('financial_categories')
  .select('id')
  .eq('nome', categoria_final)
  .single();
```

Problemas:
1. **Renomear** uma categoria quebra toda a IA -- "Materiais de Obra" vira "Materiais e Insumos" e o match para de funcionar
2. **Case sensitivity** -- o Supabase `.eq()` e case-sensitive por padrao
3. **Categorias desativadas** -- o query nao filtra `ativo = true`

### 3.2 Recomendacao: Match por ID com Fallback

**Solucao em duas camadas:**

1. **Criar coluna `slug` ou `codigo` na tabela `financial_categories`** -- imutavel, usado para matching programatico:

```sql
ALTER TABLE financial_categories ADD COLUMN codigo text UNIQUE;
UPDATE financial_categories SET codigo = 'mao_obra_direta' WHERE nome = 'Mao de Obra Direta';
UPDATE financial_categories SET codigo = 'materiais_obra' WHERE nome = 'Materiais de Obra';
-- etc.
```

2. **A IA deve retornar o `codigo`**, nao o nome. O prompt do Claude deve listar os codigos disponiveis.

3. **Fallback:** Se o codigo nao for encontrado, atribuir uma categoria default (ex: `outros_cv`) e marcar no `nfe_inbox` para revisao manual.

### 3.3 Categorias Seed Atuais

Verificacao das 8 categorias seed (migration `20260326000100`):

| Nome | Prefixo | Receita? | Relevante para NF-e? |
|---|---|---|---|
| Mao de Obra Direta | CV | Nao | Sim -- NF-e de servicos de mao de obra |
| Materiais de Obra | CV | Nao | Sim -- NF-e de compra de materiais (mais comum) |
| Servicos Prestados | CV | Nao | Sim -- NF-e de servicos terceirizados |
| Equipamentos e Ferramentas | CV | Nao | Sim -- NF-e de aluguel/compra de equipamentos |
| Reembolsos e Outras Despesas de Obras | CV | Nao | Menos provavel |
| Aporte de Clientes | ROP | Sim | NAO -- receita, nao vem como despesa via NF-e |
| Servicos Prestados (receita) | ROP | Sim | NAO -- NF-e emitida, nao recebida |
| Custo Administrativo (indireto) | ADM | Nao | Possivel -- NF-e de material de escritorio |

A IA precisa classificar entre essencialmente 5 categorias de custo. O prompt deve ser bem especifico sobre quando usar cada uma.

---

## 4. Preocupacoes com Atribuicao de Projeto

### 4.1 Projeto Sem Conta Bancaria

A spec v3 faz:

```typescript
const { data: obra } = await supabase
  .from('projects')
  .select('id, bank_account_id')
  .eq('id', projeto_id)
  .single();

// Depois usa obra.bank_account_id para criar o lancamento
```

**Problema:** `projects.bank_account_id` e nullable (migration `20260326000400` -- `ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id)`). Se o projeto nao tem conta bancaria vinculada, a criacao do lancamento falha porque `project_financial_entries.bank_account_id` e `NOT NULL`.

**Recomendacao:**
1. Na tela de aprovacao, exigir que o usuario selecione uma conta bancaria se o projeto nao tiver uma padrao
2. Ou: definir uma conta bancaria padrao do sistema (ex: a primeira conta ativa)
3. Validar na edge function `approve-nfe` e retornar erro claro em vez de crash

### 4.2 Nenhum Projeto Ativo

Se nao existem projetos ativos, a fila de aprovacao deveria permitir que o usuario crie o lancamento sem projeto (o que nao e possivel no schema atual -- `project_id` e `NOT NULL` em `project_financial_entries`).

**Recomendacao:** A tela de aprovacao deve listar apenas projetos ativos. Se nao houver nenhum, mostrar mensagem clara. A NF-e fica "pendente" na inbox ate que um projeto seja criado/selecionado.

### 4.3 Atribuicao Automatica de Projeto

A spec v3 menciona sugestao de projeto por IA. Isso e ambicioso e fragil. NF-e nao contem informacao direta sobre qual obra o material foi comprado.

**Recomendacao:** Na v3 inicial, nao tentar auto-atribuir projeto. Deixar o campo obrigatorio na tela de aprovacao manual. Auto-atribuicao pode vir na v4 com base em historico (ex: "este fornecedor sempre entrega para a Obra X").

---

## 5. Integracao com Fluxos Existentes

### 5.1 Interacao com Conciliacao Bancaria

Quando uma NF-e e aprovada, cria um `project_financial_entries` com `situacao = 'pendente'`. O fluxo de conciliacao (CSV import + auto-match) ja funciona assim:

1. Lancamento criado -> `situacao = 'pendente'`
2. Extrato importado -> edge function `import-bank-statement` tenta match por valor + data
3. Match encontrado -> `situacao = 'conciliado'`

**NF-e aprovadas seguem o mesmo fluxo naturalmente.** O campo `tipo_documento = 'NF-e'` e informativo mas nao afeta o matching.

**Ponto de atencao:** A data no lancamento criado via NF-e deve ser a `data de emissao` da NF-e (campo `dhEmi` do XML), nao a data de aprovacao. Isso e critico para o match com o extrato bancario funcionar, pois o debito no banco acontece proximo a data da NF-e, nao da aprovacao.

### 5.2 Interacao com Rateio

O rateio funciona para lancamentos com categoria `prefixo = 'ADM'`. NF-e tipicamente geram lancamentos com `prefixo = 'CV'` (materiais, mao de obra, servicos). Portanto:

- **NF-e de materiais de obra** -> CV -> NAO entra no rateio (correto)
- **NF-e de material de escritorio** -> ADM -> ENTRA no rateio (correto)

**Nenhuma mudanca necessaria no fluxo de rateio.** A categorizacao correta pela IA e o que garante o comportamento correto.

### 5.3 Visibilidade na Tela Global de Lancamentos

A pagina `/financeiro/lancamentos` (`LancamentosGlobal.tsx`) lista todos os `project_financial_entries`. Lancamentos criados via NF-e aparecerao naturalmente.

**Melhoria recomendada:** Adicionar indicador visual (badge ou icone) quando `chave_nfe IS NOT NULL`, para que o usuario saiba que aquele lancamento veio de uma NF-e e pode ter o XML associado.

### 5.4 Funcao `calc_project_balance`

Quando o frontend cria um lancamento, chama `supabase.rpc("calc_project_balance", { p_project_id })` (linha 182 do `LancamentoForm.tsx`). A edge function `approve-nfe` tambem precisa chamar essa funcao apos criar o lancamento.

**Acao:** Garantir que `approve-nfe` chame `calc_project_balance` apos inserir o lancamento.

---

## 6. Pre-Mudancas Necessarias (ANTES de implementar v3)

### 6.1 Migrations de Banco de Dados

| # | Migration | Descricao | Prioridade |
|---|---|---|---|
| M1 | `20260327000200_nfe_inbox.sql` | Criar tabela `nfe_inbox` com todas as colunas | CRITICA |
| M2 | `20260327000300_suppliers_document_unique.sql` | `CREATE UNIQUE INDEX idx_suppliers_document_unique ON suppliers(document) WHERE document IS NOT NULL` | CRITICA |
| M3 | `20260327000400_financial_categories_codigo.sql` | `ALTER TABLE financial_categories ADD COLUMN codigo text UNIQUE` + UPDATE dos seeds | ALTA |
| M4 | Storage bucket | Criar bucket `nfe-xml` no Supabase Storage via dashboard ou migration | ALTA |

### 6.2 Regenerar Types do Supabase

```bash
supabase gen types typescript --project-id qajzskxuvxsbvuyuvlnd > src/integrations/supabase/types.ts
```

Isso resolve os `as any` do codigo v2 e garante que o v3 tenha tipagem correta.

**Prioridade:** ALTA (fazer ANTES de qualquer codigo frontend v3).

### 6.3 Mudancas no Frontend (preparatorias)

| # | Arquivo | Mudanca | Prioridade |
|---|---|---|---|
| F1 | `LancamentosGlobal.tsx` / `Lancamentos.tsx` | Adicionar badge "NF-e" quando `chave_nfe` nao e null | BAIXA (pode vir junto com v3) |
| F2 | `App.tsx` | Adicionar rota `/financeiro/nfe` para a pagina da inbox | MEDIA (parte do v3) |
| F3 | `SupplierForm.tsx` | Validar CNPJ com mascara + label "CPF/CNPJ" (nao so "CNPJ") | BAIXA |

### 6.4 Configuracao de Infraestrutura

| # | Item | Descricao | Prioridade |
|---|---|---|---|
| I1 | Resend Inbound | Configurar dominio para recebimento de email (ex: `nfe@ars.engenharia.com`) | CRITICA |
| I2 | DNS MX | Apontar MX do dominio para Resend | CRITICA |
| I3 | Webhook URL | Configurar webhook no Resend apontando para a edge function `receive-nfe-email` | CRITICA |
| I4 | Supabase Secret | Adicionar `ANTHROPIC_API_KEY` nos secrets da edge function (para classificacao com Claude) | CRITICA |
| I5 | Supabase Secret | Adicionar `RESEND_WEBHOOK_SECRET` para validar assinatura do webhook | ALTA |
| I6 | Dominio/DNS | Verificar se ARS Engenharia ja tem dominio proprio para o email de NF-e | BLOQUEANTE |

---

## 7. Riscos e Recomendacoes

### 7.1 Riscos

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| R1 | Spec v3 usa `cpf_cnpj` mas campo real e `document` -- codigo falha silenciosamente | ALTA | CRITICO | Corrigir todos os nomes de coluna na spec antes de codificar |
| R2 | NF-e duplicadas (mesmo XML reenviado por email) | MEDIA | MEDIO | `chave_nfe UNIQUE` ja existe -- a deduplicacao funciona se a constraint for respeitada |
| R3 | XML mal-formado ou NF-e de servico (NFS-e) em vez de NF-e | MEDIA | MEDIO | Validacao robusta no parser, rejeitar NFS-e com mensagem clara |
| R4 | Classificacao errada pela IA | ALTA | BAIXO | Fila de aprovacao manual mitiga isso -- o usuario sempre revisa |
| R5 | Dominio de email nao configurado, NF-e nao chegam | ALTA | BLOQUEANTE | Validar infraestrutura Resend + DNS antes de comecar codigo |
| R6 | Race condition na auto-criacao de supplier | BAIXA | MEDIO | Indice UNIQUE parcial + ON CONFLICT |
| R7 | Projeto sem bank_account_id, aprovacao falha | MEDIA | ALTO | Validacao na UI e na edge function |

### 7.2 Ordem de Implementacao Recomendada

**Fase 3A -- Fundacao (1-2 dias)**
1. Executar migrations M1-M4
2. Regenerar types do Supabase
3. Configurar infraestrutura (I1-I6)
4. Testar recebimento de email via Resend (sem processamento)

**Fase 3B -- Backend (2-3 dias)**
1. Edge function `receive-nfe-email` (receber webhook, salvar XML no storage, inserir na inbox)
2. Edge function `parse-nfe-xml` (extrair dados do XML, popular `dados_parseados`)
3. Edge function `approve-nfe` (criar lancamento + fornecedor, chamar `calc_project_balance`)
4. Testes com XML real de NF-e

**Fase 3C -- Frontend (2-3 dias)**
1. Pagina `/financeiro/nfe` com tabela da inbox (status, dados resumidos)
2. Dialog de aprovacao (selecionar projeto, conta bancaria, confirmar/alterar categoria)
3. Botao de rejeicao com motivo
4. Badge "NF-e" nas telas de lancamentos

**Fase 3D -- IA e Polish (1-2 dias)**
1. Integracao com Claude para sugestao de categoria
2. Testes end-to-end com fluxo completo
3. Documentacao

### 7.3 O Que Testar Primeiro

1. **Enviar email com XML de NF-e real para o endereco configurado** -- verificar se o webhook do Resend dispara
2. **Parsear um XML de NF-e de verdade** -- existem muitas variacoes entre estados e versoes (3.10, 4.00)
3. **Buscar fornecedor por CNPJ usando o campo `document`** -- confirmar que o campo existe e o query funciona
4. **Criar lancamento automatico com todos os campos obrigatorios** -- especialmente `bank_account_id`
5. **Deduplicacao** -- enviar a mesma NF-e duas vezes e verificar que a segunda e rejeitada

---

## Resumo Executivo

O sistema v2 foi bem planejado para receber a v3 -- campos como `chave_nfe`, `tipo_documento = 'NF-e'`, e a estrutura granular de fornecedores ja estao no lugar. Porem, a spec v3 foi escrita com nomes de coluna que NAO correspondem ao schema real (o gap mais critico e `cpf_cnpj` vs `document`). Alem disso, faltam 4 itens de banco de dados (tabela `nfe_inbox`, indice UNIQUE em `document`, coluna `codigo` em categorias, bucket de storage) e toda a configuracao de infraestrutura de email (Resend + DNS).

A recomendacao principal e: **corrigir a spec v3 para usar os nomes de coluna reais ANTES de escrever qualquer codigo, e validar a infraestrutura de email como primeiro passo.**
