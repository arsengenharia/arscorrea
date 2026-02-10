

# Plano: Fornecedores, Novos Campos em Clients/Proposals/Contracts + Fix Build Error

## Resumo

Criar a tabela `fornecedores` (suppliers), adicionar campos CRM em `clients`, `proposals` e `contracts`, e corrigir o erro de build em `ProjectDetails.tsx`.

## 1. Migracao de Banco de Dados

### 1.1 Nova tabela: `suppliers` (fornecedores)

Manter o padrao de nomes em ingles do projeto existente.

```text
suppliers
  - id (uuid, PK, default gen_random_uuid())
  - trade_name (text, NOT NULL) -- nome fantasia
  - legal_name (text) -- razao social
  - document (text) -- CNPJ
  - contact_name (text) -- contato principal
  - phone (text)
  - email (text)
  - address (text)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
```

RLS: SELECT/INSERT/UPDATE/DELETE para `auth.role() = 'authenticated'`.
Trigger `update_updated_at_column` no UPDATE.

### 1.2 Novos campos em `clients`

- `client_type` (text, nullable) -- Pessoa Fisica / Pessoa Juridica / Condominio
- `segment` (text, nullable) -- Residencial / Comercial / Industrial

### 1.3 Novos campos em `proposals`

- `project_id` (uuid, nullable, FK para projects.id) -- vincular proposta a obra
- `loss_reason` (text, nullable) -- motivo de perda
- `expected_close_date` (date, nullable) -- data prevista de fechamento

### 1.4 Novos campos em `contracts`

- `project_id` (uuid, nullable, FK para projects.id) -- vincular contrato a obra
- `due_date` (date, nullable) -- data de vencimento
- `additive_value` (numeric, default 0) -- valor de aditivos

### 1.5 Novo campo em `project_costs`

- `supplier_id` (uuid, nullable, FK para suppliers.id) -- vincular custo a fornecedor

## 2. Alteracoes no Frontend

### 2.1 Fix build error: `ProjectDetails.tsx` (linha 157)

Substituir `project.code` por `projectId?.slice(0, 8)` -- a tabela `projects` nao tem campo `code`.

### 2.2 Formularios de Cliente (ClientForm.tsx + EditClientDialog.tsx)

Adicionar dois campos no bloco "Dados Basicos":
- **Tipo de Cliente**: Select com opcoes "Pessoa Fisica", "Pessoa Juridica", "Condominio"
- **Segmento**: Select com opcoes "Residencial", "Comercial", "Industrial"

Atualizar o schema zod e o submit para incluir `client_type` e `segment`.

### 2.3 Formulario de Proposta (ProposalFormContent.tsx)

Adicionar campos ao formData e ao `saveProposal`:
- **Motivo de Perda** (textarea, visivel apenas quando status = "perdida")
- **Data Prevista de Fechamento** (input date)
- **Obra Vinculada** (select opcional, lista de projects)

### 2.4 Formulario de Contrato (ContractFormContent.tsx)

Adicionar campos ao state e ao `saveMutation`:
- **Obra Vinculada** (select opcional, lista de projects)
- **Data de Vencimento** (input date)
- **Valor de Aditivos** (input numerico)

### 2.5 Pagina de Fornecedores (nova)

- **`src/pages/Suppliers.tsx`**: Listagem com tabela (nome fantasia, CNPJ, contato, telefone, email) + botao "Novo Fornecedor"
- **`src/components/suppliers/SuppliersList.tsx`**: Componente de listagem com busca
- **`src/components/suppliers/SupplierForm.tsx`**: Formulario de cadastro/edicao em dialog
- **Rota**: `/fornecedores` adicionada ao `App.tsx`
- **Menu lateral**: Adicionar item "Fornecedores" no `AppSidebar.tsx`

## 3. Arquivos Criados

1. `src/pages/Suppliers.tsx`
2. `src/components/suppliers/SuppliersList.tsx`
3. `src/components/suppliers/SupplierForm.tsx`

## 4. Arquivos Modificados

1. `src/pages/ProjectDetails.tsx` -- fix `project.code`
2. `src/components/clients/ClientForm.tsx` -- campos `client_type`, `segment`
3. `src/components/clients/EditClientDialog.tsx` -- campos `client_type`, `segment`
4. `src/components/proposals/ProposalFormContent.tsx` -- campos `loss_reason`, `expected_close_date`, `project_id`
5. `src/components/contracts/ContractFormContent.tsx` -- campos `project_id`, `due_date`, `additive_value`
6. `src/App.tsx` -- rota `/fornecedores`
7. `src/components/layout/AppSidebar.tsx` -- item de menu "Fornecedores"

## 5. Sequencia de Implementacao

1. Executar migracao SQL (nova tabela + novos campos + RLS + trigger)
2. Corrigir build error em ProjectDetails.tsx
3. Atualizar formularios de clientes com novos campos
4. Atualizar formulario de propostas com novos campos
5. Atualizar formulario de contratos com novos campos
6. Criar pagina e componentes de fornecedores
7. Adicionar rota e menu lateral

