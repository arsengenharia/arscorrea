
# Plano: Modulo PROPOSTAS

## Resumo

Criar um modulo completo para gerenciamento de propostas comerciais, incluindo banco de dados, rotas, interface de usuario e geracao de PDF. O modulo seguira os padroes ja existentes no projeto.

---

## 1. Banco de Dados

### 1.1 Tabela `proposals`

```text
+------------------------+------------------+------------------------------------+
| Coluna                 | Tipo             | Detalhes                           |
+------------------------+------------------+------------------------------------+
| id                     | uuid             | PK, default gen_random_uuid()      |
| number                 | text             | UNIQUE, auto-gerado (PROP-YYYY-NNNN)|
| client_id              | uuid             | FK -> clients.id, NOT NULL         |
| title                  | text             | Ex: "Proposta Reforma Fachada"     |
| condo_name             | text             | Nome do condominio                 |
| work_address           | text             | Endereco da obra                   |
| city                   | text             | Cidade                             |
| state                  | text             | UF                                 |
| scope_text             | text             | Escopo (texto longo)               |
| validity_days          | int              | Default 10                         |
| execution_days         | int              | Default 60                         |
| payment_terms          | text             | Condicoes de pagamento             |
| warranty_terms         | text             | Garantia                           |
| exclusions             | text             | Exclusoes                          |
| notes                  | text             | Observacoes                        |
| discount_type          | text             | 'percent' ou 'fixed', default 'fixed'|
| discount_value         | numeric          | Default 0                          |
| subtotal               | numeric          | Default 0                          |
| total                  | numeric          | Default 0                          |
| status                 | text             | 'draft'|'sent'|'approved'|'rejected'|
| pdf_path               | text             | Path no storage (nullable)         |
| created_by             | uuid             | Default auth.uid()                 |
| created_at             | timestamptz      | Default now()                      |
| updated_at             | timestamptz      | Default now()                      |
+------------------------+------------------+------------------------------------+
```

### 1.2 Tabela `proposal_items`

```text
+------------------------+------------------+------------------------------------+
| Coluna                 | Tipo             | Detalhes                           |
+------------------------+------------------+------------------------------------+
| id                     | uuid             | PK, default gen_random_uuid()      |
| proposal_id            | uuid             | FK -> proposals.id, ON DELETE CASCADE|
| category               | text             | Categoria do servico               |
| description            | text             | Descricao do servico               |
| unit                   | text             | 'm2'|'m'|'un'|'vb'|'dia'|'mes'     |
| quantity               | numeric          | Default 0                          |
| unit_price             | numeric          | Default 0                          |
| total                  | numeric          | Calculado (quantity * unit_price)  |
| order_index            | int              | Ordem de exibicao                  |
| notes                  | text             | Observacoes (nullable)             |
| created_at             | timestamptz      | Default now()                      |
+------------------------+------------------+------------------------------------+
```

### 1.3 Sequence para Numeracao Automatica

```sql
CREATE SEQUENCE proposal_number_seq START 1;
```

### 1.4 Trigger para Gerar Numero

Funcao que gera numero no formato `PROP-2026-0001` automaticamente no INSERT.

### 1.5 Storage Bucket

- Bucket: `proposals` (privado)
- Estrutura: `proposals/{proposal_id}/proposta.pdf`
- RLS para usuarios autenticados

### 1.6 RLS Policies

- SELECT/INSERT/UPDATE/DELETE para usuarios autenticados (equipe compartilhada)

---

## 2. Rotas e Paginas

### 2.1 Estrutura de Arquivos

```text
src/
  pages/
    Proposals.tsx           # Lista + navegacao (/propostas)
    ProposalForm.tsx        # Criar/Editar (/propostas/nova e /propostas/:id)
  components/
    proposals/
      ProposalsList.tsx     # Tabela de propostas
      ProposalFormContent.tsx  # Formulario principal
      ProposalClientSection.tsx  # Secao de selecao de cliente
      ProposalWorkSection.tsx    # Dados da obra
      ProposalScopeSection.tsx   # Escopo
      ProposalItemsSection.tsx   # Tabela de itens editavel
      ProposalTotalsSection.tsx  # Subtotal, desconto, total
      ProposalTermsSection.tsx   # Condicoes comerciais
      ProposalStatusBadge.tsx    # Badge de status
      ProposalActions.tsx        # Botoes de acao
      pdf/
        ProposalPDF.tsx         # Documento PDF
        ProposalPDFHeader.tsx   # Cabecalho com logo
        ProposalPDFClient.tsx   # Info do cliente
        ProposalPDFItems.tsx    # Tabela de itens
        ProposalPDFTerms.tsx    # Condicoes
        proposalStyles.ts       # Estilos do PDF
```

### 2.2 Atualizacao do App.tsx

Adicionar rotas:
- `/propostas` -> Proposals.tsx
- `/propostas/nova` -> ProposalForm.tsx (modo criacao)
- `/propostas/:id` -> ProposalForm.tsx (modo edicao)

### 2.3 Atualizacao do Menu Lateral

Adicionar item "Propostas" no AppSidebar.tsx com icone FileText.

---

## 3. Interface do Usuario

### 3.1 Pagina Lista (/propostas)

- Cabecalho com titulo e botoes "Nova Proposta" e "Lista de Propostas"
- Tabela com colunas:
  - Numero/Titulo
  - Cliente
  - Condominio/Local
  - Status (badge colorido)
  - Total (formatado em R$)
  - Data de criacao
- Acoes: Visualizar, Editar, Excluir, Baixar PDF

### 3.2 Pagina Formulario (/propostas/nova e /propostas/:id)

**A) Cabecalho**
- Titulo "Nova Proposta" ou "Editar Proposta"
- Badge de status
- Botoes: Salvar Rascunho, Gerar PDF, Marcar como Enviada

**B) Secao Cliente (obrigatorio)**
- Select/autocomplete buscando da tabela clients
- Se nao houver clientes: CTA "Cadastrar Cliente" com link para /clientes
- Apos selecao: card exibindo dados do cliente automaticamente

**C) Secao Dados da Obra**
- Condominio/Empreendimento (condo_name)
- Endereco da obra (work_address)
- Cidade (city) / UF (state)

**D) Secao Escopo**
- Textarea com texto padrao de reforma de fachadas pre-preenchido
- Texto editavel

**E) Secao Itens da Proposta**
- Tabela editavel com colunas:
  - Categoria (select com opcoes pre-definidas)
  - Descricao
  - Unidade (select: m2, m, un, vb, dia, mes)
  - Quantidade
  - Valor Unitario
  - Total (calculado automaticamente)
- Botao adicionar item
- Botao remover item
- Campo de observacao por item
- Reordenacao via setas ou drag-and-drop

**F) Secao Totais**
- Subtotal (soma automatica dos itens)
- Desconto (tipo: percentual ou fixo + valor)
- Total final (calculado)

**G) Secao Condicoes Comerciais**
- Prazo de execucao (execution_days)
- Validade da proposta (validity_days)
- Forma de pagamento (payment_terms) - textarea
- Garantia (warranty_terms) - textarea
- Exclusoes (exclusions) - textarea
- Observacoes (notes) - textarea

---

## 4. Funcionalidades

### 4.1 Calculos Automaticos

- Total por item = quantidade x valor_unitario
- Subtotal = soma de todos os totais dos itens
- Total final:
  - Se desconto percentual: subtotal - (subtotal * percentual / 100)
  - Se desconto fixo: subtotal - valor_fixo

### 4.2 Persistencia

- Salvar proposta e itens no Supabase
- Criar: INSERT em proposals + INSERT em proposal_items
- Editar: UPDATE em proposals + DELETE/INSERT em proposal_items
- Carregar proposta com itens na edicao

### 4.3 Geracao de PDF

- Usar @react-pdf/renderer (ja instalado)
- Estrutura do PDF:
  - Logo ARS/Correa no cabecalho
  - Numero e data da proposta
  - Dados do cliente
  - Dados da obra
  - Tabela de itens com categorias
  - Subtotal, desconto, total
  - Condicoes comerciais
- Salvar no bucket proposals via Supabase Storage
- Gravar pdf_path na tabela proposals
- Usar signed URLs para download

### 4.4 Fluxo de Status

- draft (Rascunho) - padrao
- sent (Enviada)
- approved (Aprovada)
- rejected (Rejeitada)

---

## 5. Texto Padrao do Escopo

Texto inicial para reforma de fachadas:

```
SERVICOS DE REFORMA DE FACHADA

1. SERVICOS PRELIMINARES
- Mobilizacao e instalacao de canteiro de obras
- Isolamento e sinalizacao da area de trabalho

2. ACESSO E SEGURANCA
- Instalacao de sistema de acesso (balancim/andaime)
- Equipamentos de protecao coletiva

3. TRATAMENTO DE PATOLOGIAS
- Mapeamento e identificacao de anomalias
- Tratamento de fissuras e trincas
- Recuperacao de areas deterioradas

4. RECUPERACAO DE CONCRETO
- Remocao de concreto desagregado
- Tratamento de armaduras expostas
- Aplicacao de argamassa estrutural

5. SELANTES E JUNTAS
- Tratamento de juntas de dilatacao
- Aplicacao de selantes

6. PINTURA E REVITALIZACAO
- Preparacao de superficie
- Aplicacao de textura/pintura

7. LIMPEZA E PROTECAO
- Limpeza final
- Aplicacao de hidrofugante (se aplicavel)
```

---

## 6. Categorias de Itens Pre-definidas

- Servicos preliminares
- Acesso e seguranca
- Tratamento de patologias
- Recuperacao de concreto
- Selantes/Juntas
- Pintura/Revitalizacao
- Limpeza/Protecao
- Mobilizacao
- Outros

---

## 7. Detalhes Tecnicos

### 7.1 Queries Supabase

Listagem com cliente:
```typescript
supabase
  .from('proposals')
  .select(`*, client:clients(id, name)`)
  .order('created_at', { ascending: false })
```

Detalhes com itens:
```typescript
supabase
  .from('proposals')
  .select(`*, client:clients(*), proposal_items(*)`)
  .eq('id', proposalId)
  .order('order_index', { foreignTable: 'proposal_items' })
  .single()
```

### 7.2 Upload do PDF

```typescript
const pdfBlob = await pdf(<ProposalPDF proposal={proposal} />).toBlob();
await supabase.storage
  .from('proposals')
  .upload(`${proposalId}/proposta.pdf`, pdfBlob);
```

### 7.3 Tipos TypeScript

Atualizar types.ts automaticamente apos migracao (feito pelo sistema).

---

## 8. Resumo de Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| supabase/migrations/xxx.sql | Tabelas, RLS, bucket |
| src/pages/Proposals.tsx | Pagina principal |
| src/pages/ProposalForm.tsx | Formulario criar/editar |
| src/components/proposals/ProposalsList.tsx | Lista de propostas |
| src/components/proposals/ProposalFormContent.tsx | Conteudo do formulario |
| src/components/proposals/ProposalClientSection.tsx | Selecao de cliente |
| src/components/proposals/ProposalWorkSection.tsx | Dados da obra |
| src/components/proposals/ProposalScopeSection.tsx | Escopo |
| src/components/proposals/ProposalItemsSection.tsx | Itens editaveis |
| src/components/proposals/ProposalTotalsSection.tsx | Totais |
| src/components/proposals/ProposalTermsSection.tsx | Condicoes |
| src/components/proposals/ProposalStatusBadge.tsx | Badge status |
| src/components/proposals/ProposalActions.tsx | Acoes |
| src/components/proposals/pdf/ProposalPDF.tsx | Documento PDF |
| src/components/proposals/pdf/proposalStyles.ts | Estilos PDF |
| src/App.tsx | Adicionar rotas |
| src/components/layout/AppSidebar.tsx | Adicionar menu |

---

## 9. Ordem de Implementacao

1. Migracao SQL (tabelas, sequence, trigger, RLS, bucket)
2. Atualizar App.tsx com rotas
3. Atualizar AppSidebar.tsx com menu
4. Criar pagina Proposals.tsx
5. Criar componente ProposalsList.tsx
6. Criar pagina ProposalForm.tsx e componentes do formulario
7. Implementar logica de calculos
8. Criar componentes PDF
9. Integrar upload de PDF ao storage
10. Testar fluxo completo

