
# Plano: Modulo de Contratos com Gestao Financeira

## Visao Geral

Este plano implementa um modulo completo de Contratos derivados de Propostas, com gestao financeira integrada (recebimentos e comissionamento). O modulo mantem independencia total das tabelas existentes.

---

## 1. Alteracoes no Banco de Dados

### 1.1 Sequencia para Numeracao Automatica

```sql
CREATE SEQUENCE IF NOT EXISTS public.contract_number_seq START 1;
```

### 1.2 Tabela `contracts`

```sql
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  title text,
  scope_text text,
  subtotal numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  discount_value numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'ativo',
  payment_entry_value numeric DEFAULT 0,
  payment_installments_count integer DEFAULT 0,
  payment_installment_value numeric DEFAULT 0,
  payment_notes text,
  commission_expected_value numeric DEFAULT 0,
  commission_expected_date date,
  commission_received_value numeric DEFAULT 0,
  commission_notes text,
  pdf_path text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.3 Trigger para Numeracao Automatica

```sql
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger LANGUAGE plpgsql
SET search_path = 'public' AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CONT-' || 
      EXTRACT(YEAR FROM now())::TEXT || '-' || 
      LPAD(nextval('public.contract_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_contract_number
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION generate_contract_number();
```

### 1.4 Tabela `contract_items`

```sql
CREATE TABLE public.contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  category text,
  description text,
  unit text,
  quantity numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  order_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### 1.5 Tabela `contract_financial`

```sql
CREATE TABLE public.contract_financial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'recebimento', 'comissao', 'ajuste'
  description text,
  expected_value numeric DEFAULT 0,
  received_value numeric DEFAULT 0,
  expected_date date,
  received_date date,
  status text DEFAULT 'pendente', -- 'pendente', 'parcial', 'recebido'
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### 1.6 Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false)
ON CONFLICT DO NOTHING;
```

### 1.7 RLS Policies

```sql
-- contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create contracts"
  ON public.contracts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete contracts"
  ON public.contracts FOR DELETE USING (auth.role() = 'authenticated');

-- contract_items
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
-- (mesmas politicas)

-- contract_financial
ALTER TABLE public.contract_financial ENABLE ROW LEVEL SECURITY;
-- (mesmas politicas)

-- Storage policies para bucket contracts
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Authenticated users can update contracts storage"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
```

---

## 2. Estrutura de Arquivos

```text
src/
  pages/
    Contracts.tsx                  (lista de contratos)
    ContractForm.tsx               (criar/editar contrato)
    ContractFinancial.tsx          (gestao financeira)
  components/
    contracts/
      ContractsList.tsx            (tabela de listagem)
      ContractStatusBadge.tsx      (badge de status)
      ContractProposalSelect.tsx   (selecao de proposta)
      ContractClientSection.tsx    (dados do cliente readonly)
      ContractItemsSection.tsx     (itens editaveis - reutiliza padrao)
      ContractPaymentSection.tsx   (forma de pagamento estruturada)
      ContractCommissionSection.tsx (comissionamento)
      ContractTotalsSection.tsx    (subtotal/desconto/total)
      ContractFormContent.tsx      (formulario principal)
      FinancialList.tsx            (listagem de lancamentos)
      FinancialItemRow.tsx         (linha editavel do financeiro)
      pdf/
        ContractPDF.tsx            (geracao PDF)
        contractStyles.ts          (estilos PDF)
```

---

## 3. Rotas

Adicionar em `App.tsx`:

```typescript
import Contracts from "./pages/Contracts";
import ContractForm from "./pages/ContractForm";
import ContractFinancial from "./pages/ContractFinancial";

// Novas rotas protegidas:
<Route path="/contratos" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
<Route path="/contratos/novo" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
<Route path="/contratos/:id" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
<Route path="/contratos/:id/financeiro" element={<ProtectedRoute><ContractFinancial /></ProtectedRoute>} />
```

---

## 4. Navegacao

Adicionar item "Contratos" no menu (`TopNavigation.tsx`):

```typescript
{ title: "Contratos", icon: ScrollText, path: "/contratos" },
```

---

## 5. Pagina de Listagem (`/contratos`)

### Colunas da Tabela

| Numero | Cliente | Total | Status | Comissao | Data | Acoes |
|--------|---------|-------|--------|----------|------|-------|
| CONT-2026-0001 | Nome (CNPJ) | R$ 50.000 | Ativo | R$ 2.500 / R$ 1.000 | 08/02/2026 | ... |

### Componentes

- `ContractsList.tsx`: Query com join em `clients`
- `ContractStatusBadge.tsx`: Cores para ativo/em_assinatura/encerrado/cancelado
- Acoes: Editar, Baixar PDF, Financeiro, Excluir

---

## 6. Formulario de Contrato (`/contratos/novo` e `/contratos/:id`)

### Secoes do Formulario

1. **Selecao de Proposta** (obrigatorio ao criar)
   - `ContractProposalSelect.tsx`
   - Dropdown com numero + cliente + total
   - Ao selecionar: preenche automaticamente todos os campos

2. **Dados do Cliente** (readonly)
   - `ContractClientSection.tsx`
   - Reutiliza `ClientDataBlock.tsx` com botao "Editar"

3. **Conteudo do Contrato** (editavel)
   - Titulo (input)
   - Escopo (`Textarea` grande)
   - Itens (`ContractItemsSection.tsx` - mesmo padrao da proposta)

4. **Totais**
   - `ContractTotalsSection.tsx`
   - Subtotal, Desconto (tipo + valor), Total

5. **Forma de Pagamento**
   - `ContractPaymentSection.tsx`
   - Campo livre `payment_notes` (textarea)
   - Campos estruturados:
     - Entrada (`payment_entry_value`)
     - Numero de parcelas (`payment_installments_count`)
     - Valor por parcela (`payment_installment_value`) - sugestao automatica
   - Botao "Gerar Lancamentos" (opcional)

6. **Comissionamento**
   - `ContractCommissionSection.tsx`
   - Valor previsto (`commission_expected_value`)
   - Data previsao (`commission_expected_date`)
   - Observacoes (`commission_notes`)

### Botoes de Acao

- Salvar (grava contrato + itens + lancamento de comissao no financial)
- Gerar PDF
- Voltar

### Logica de Criacao

```typescript
// Ao salvar contrato:
1. Insert/update em contracts
2. Delete + insert em contract_items
3. Upsert em contract_financial (linha de comissao)
```

---

## 7. Gestao Financeira (`/contratos/:id/financeiro`)

### Layout

- Resumo do contrato no topo (total, entrada, parcelas, comissao prevista)
- Tabela de lancamentos (`contract_financial`)

### Tabela de Lancamentos

| Tipo | Descricao | Previsto | Recebido | Data Prev. | Data Rec. | Status | Acoes |
|------|-----------|----------|----------|------------|-----------|--------|-------|
| Recebimento | Entrada | R$ 10.000 | R$ 10.000 | 10/02 | 10/02 | Recebido | ... |
| Recebimento | Parcela 1/5 | R$ 8.000 | R$ 0 | 10/03 | - | Pendente | ... |
| Comissao | Comissao | R$ 2.500 | R$ 1.000 | 15/02 | 15/02 | Parcial | ... |

### Funcionalidades

- Editar inline: `received_value`, `received_date`, `status`
- Ao atualizar comissao: sincronizar `contracts.commission_received_value`
- Adicionar novo lancamento (botao)

### Componentes

- `FinancialList.tsx`: Lista de lancamentos
- `FinancialItemRow.tsx`: Linha editavel com inline editing

---

## 8. Geracao de Lancamentos Automaticos

Quando usuario clica "Gerar Lancamentos":

```typescript
const generateFinancialEntries = () => {
  const entries = [];
  
  // Entrada
  if (paymentEntryValue > 0) {
    entries.push({
      type: 'recebimento',
      description: 'Entrada',
      expected_value: paymentEntryValue,
      status: 'pendente'
    });
  }
  
  // Parcelas
  for (let i = 1; i <= installmentsCount; i++) {
    entries.push({
      type: 'recebimento',
      description: `Parcela ${i}/${installmentsCount}`,
      expected_value: installmentValue,
      expected_date: addMonths(new Date(), i), // sugestao
      status: 'pendente'
    });
  }
  
  return entries;
};
```

---

## 9. Sincronizacao de Comissao

Ao atualizar `received_value` de um lancamento tipo 'comissao':

```typescript
// Somar todos os received_value de tipo 'comissao'
const totalReceived = await supabase
  .from('contract_financial')
  .select('received_value')
  .eq('contract_id', contractId)
  .eq('type', 'comissao');

// Atualizar contracts.commission_received_value
await supabase
  .from('contracts')
  .update({ commission_received_value: sum })
  .eq('id', contractId);
```

---

## 10. Resumo de Implementacao

### Arquivos Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Contracts.tsx` | Pagina de listagem |
| `src/pages/ContractForm.tsx` | Pagina de formulario |
| `src/pages/ContractFinancial.tsx` | Pagina de gestao financeira |
| `src/components/contracts/ContractsList.tsx` | Tabela de contratos |
| `src/components/contracts/ContractStatusBadge.tsx` | Badge de status |
| `src/components/contracts/ContractProposalSelect.tsx` | Selecao de proposta |
| `src/components/contracts/ContractClientSection.tsx` | Dados do cliente |
| `src/components/contracts/ContractItemsSection.tsx` | Itens do contrato |
| `src/components/contracts/ContractPaymentSection.tsx` | Forma de pagamento |
| `src/components/contracts/ContractCommissionSection.tsx` | Comissionamento |
| `src/components/contracts/ContractTotalsSection.tsx` | Totais |
| `src/components/contracts/ContractFormContent.tsx` | Formulario completo |
| `src/components/contracts/FinancialList.tsx` | Lista de lancamentos |
| `src/components/contracts/FinancialItemRow.tsx` | Linha editavel |
| `src/components/contracts/pdf/ContractPDF.tsx` | PDF do contrato |
| `src/components/contracts/pdf/contractStyles.ts` | Estilos PDF |

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar 4 novas rotas |
| `src/components/layout/TopNavigation.tsx` | Adicionar item Contratos no menu |

---

## 11. Garantias

- Nenhuma alteracao nas tabelas `proposals`, `proposal_items`, `proposal_stages`
- Nenhuma alteracao no modulo de relatorios (tabelas `stages`, `projects`, etc.)
- Contratos sao independentes - apenas referenciam `proposal_id` e `client_id`
- Build sem erros garantido
