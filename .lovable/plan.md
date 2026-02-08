
# Plano: Padronizacao de Itens e Nova UX de Pagamento/Comissao

## Visao Geral

Este plano implementa:
1. Constantes compartilhadas para categorias/unidades de itens (eliminando divergencia entre Propostas e Contratos)
2. Nova tabela `contract_payments` como fonte canonica para forma de pagamento
3. Nova UX baseada em linhas para pagamentos e comissionamento
4. Resumo financeiro com validacoes e alertas

---

## 1. Constantes Compartilhadas (Shared Constants)

### Criar `src/lib/itemOptions.ts`

```typescript
export const ITEM_CATEGORIES = [
  "Mao de Obra",
  "Material",
  "Equipamento",
  "Servico Terceirizado",
  "Outros",
] as const;

export const ITEM_UNITS = [
  "un",
  "m2",
  "m",
  "vb",
  "dia",
  "mes",
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];
export type ItemUnit = typeof ITEM_UNITS[number];

// Helper para tratar categorias antigas/invalidas
export const normalizeCategory = (category: string | null): string => {
  if (!category) return "Outros";
  if (ITEM_CATEGORIES.includes(category as ItemCategory)) return category;
  return "Outros";
};

// Helper para tratar unidades antigas/invalidas
export const normalizeUnit = (unit: string | null): string => {
  if (!unit) return "un";
  if (ITEM_UNITS.includes(unit as ItemUnit)) return unit;
  return "un";
};
```

---

## 2. Atualizacao dos Componentes de Itens

### 2.1 `ProposalItemsSection.tsx`

**Alteracoes:**
- Importar `ITEM_CATEGORIES` e `ITEM_UNITS` de `@/lib/itemOptions`
- Remover constantes locais `CATEGORIES` e `UNITS`
- Usar `normalizeCategory` e `normalizeUnit` ao renderizar selects

### 2.2 `ContractItemsSection.tsx`

**Alteracoes:**
- Importar `ITEM_CATEGORIES` e `ITEM_UNITS` de `@/lib/itemOptions`
- Remover constantes locais `categoryOptions` e `unitOptions`
- Manter layout atual (ja esta padronizado)

### 2.3 Fluxo Proposta -> Contrato

**Em `ContractFormContent.tsx`:**
- Ao copiar itens da proposta, aplicar `normalizeCategory` e `normalizeUnit`
- Garantir copia 1:1 de todos os campos: `category`, `unit`, `quantity`, `unit_price`, `total`, `description`, `notes`

---

## 3. Nova Tabela `contract_payments`

### Migracao SQL

```sql
CREATE TABLE public.contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'entrada', 'parcela', 'sinal', 'ajuste', 'comissao'
  description text,
  expected_value numeric DEFAULT 0,
  expected_date date,
  received_value numeric DEFAULT 0,
  received_date date,
  status text DEFAULT 'pendente', -- 'pendente', 'parcial', 'recebido'
  order_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract payments"
  ON public.contract_payments FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create contract payments"
  ON public.contract_payments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contract payments"
  ON public.contract_payments FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contract payments"
  ON public.contract_payments FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Indice para queries por contrato
CREATE INDEX idx_contract_payments_contract_id 
  ON public.contract_payments(contract_id);
```

**Observacao:** A tabela `contract_financial` existente sera mantida por compatibilidade, mas `contract_payments` sera a fonte canonica para novos contratos. Futuramente, os dados podem ser migrados.

---

## 4. Nova Interface de Forma de Pagamento

### 4.1 Tipos Padronizados

```typescript
// src/lib/paymentTypes.ts
export const PAYMENT_KINDS = [
  { value: "entrada", label: "Entrada" },
  { value: "sinal", label: "Sinal" },
  { value: "parcela", label: "Parcela" },
  { value: "ajuste", label: "Ajuste" },
  { value: "comissao", label: "Comissao" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcial" },
  { value: "recebido", label: "Recebido" },
] as const;

export interface PaymentLine {
  id?: string;
  kind: string;
  description: string;
  expected_value: number;
  expected_date: string | null;
  received_value: number;
  received_date: string | null;
  status: string;
  order_index: number;
  notes?: string;
}
```

### 4.2 Novo Componente `ContractPaymentLinesSection.tsx`

**Estrutura:**

```text
+------------------------------------------------------------------+
| Forma de Pagamento                                                |
+------------------------------------------------------------------+
| RESUMO FINANCEIRO                                                 |
| +-------------+  +-------------+  +-------------+  +------------+ |
| | Total       |  | Previsto    |  | Recebido    |  | Diferenca  | |
| | R$ 50.000   |  | R$ 50.000   |  | R$ 10.000   |  | R$ 0       | |
| +-------------+  +-------------+  +-------------+  +------------+ |
| [!] Alerta: Previsto difere do total                              |
+------------------------------------------------------------------+
| [+ Adicionar Linha]  [Gerar Linhas (Assistido)]                   |
+------------------------------------------------------------------+
| Tipo     | Descricao    | Previsto | Data Prev | Receb | Data Rec | Status    | Acoes |
|----------|--------------|----------|-----------|-------|----------|-----------|-------|
| Entrada  | Entrada      | 15.000   | 10/02     | 15.000| 10/02    | Recebido  | [v][x]|
| Parcela  | Parcela 1/5  | 7.000    | 10/03     | 0     | -        | Pendente  | [v][x]|
| Parcela  | Parcela 2/5  | 7.000    | 10/04     | 0     | -        | Pendente  | [v][x]|
| Comissao | Comissao     | 2.500    | 15/02     | 1.000 | 15/02    | Parcial   | [v][x]|
+------------------------------------------------------------------+
| Texto livre (opcional): _________________________________________ |
+------------------------------------------------------------------+
```

**Funcionalidades:**
- Adicionar linha manualmente
- Gerar linhas assistido (entrada + N parcelas + datas sugeridas)
- Editar inline todos os campos
- Reordenar linhas (setas cima/baixo)
- Excluir linha
- Resumo automatico com alertas
- Campo de texto livre (`payment_notes`) preservado

### 4.3 Modal "Gerar Linhas (Assistido)"

**Campos:**
- Valor de entrada (obrigatorio se > 0)
- Numero de parcelas
- Data da primeira parcela
- Intervalo entre parcelas (30 dias default)
- Incluir comissao? (checkbox)
- Valor da comissao
- Data prevista da comissao

**Logica:**
```typescript
const generateLines = () => {
  const lines: PaymentLine[] = [];
  
  // Entrada
  if (entryValue > 0) {
    lines.push({
      kind: "entrada",
      description: "Entrada",
      expected_value: entryValue,
      expected_date: today,
      status: "pendente",
      order_index: 0,
    });
  }
  
  // Parcelas
  const installmentValue = (total - entryValue) / installmentsCount;
  for (let i = 1; i <= installmentsCount; i++) {
    lines.push({
      kind: "parcela",
      description: `Parcela ${i}/${installmentsCount}`,
      expected_value: installmentValue,
      expected_date: addMonths(firstDate, i - 1),
      status: "pendente",
      order_index: i,
    });
  }
  
  // Comissao
  if (includeCommission && commissionValue > 0) {
    lines.push({
      kind: "comissao",
      description: "Comissao",
      expected_value: commissionValue,
      expected_date: commissionDate,
      status: "pendente",
      order_index: lines.length,
    });
  }
  
  return lines;
};
```

---

## 5. Comissionamento Integrado

### Abordagem

- Comissao sera tratada como uma linha em `contract_payments` com `kind='comissao'`
- Permite multiplas linhas de comissao (ex: comissao por etapa)
- Resumo separado no topo mostrando total de comissoes previsto/recebido

### Remocao de Redundancia

- Campos `commission_expected_value`, `commission_received_value`, `commission_expected_date`, `commission_notes` em `contracts` serao mantidos por compatibilidade
- Ao salvar, sincronizar automaticamente:
  ```typescript
  const commissionLines = paymentLines.filter(l => l.kind === 'comissao');
  const totalExpected = commissionLines.reduce((sum, l) => sum + l.expected_value, 0);
  const totalReceived = commissionLines.reduce((sum, l) => sum + l.received_value, 0);
  
  // Atualizar contracts para compatibilidade
  await supabase
    .from('contracts')
    .update({
      commission_expected_value: totalExpected,
      commission_received_value: totalReceived,
    })
    .eq('id', contractId);
  ```

---

## 6. Resumo Financeiro com Alertas

### Componente `PaymentSummary.tsx`

**Metricas:**
- Total do contrato
- Total previsto (soma `expected_value` onde `kind != 'comissao'`)
- Total recebido (soma `received_value` onde `kind != 'comissao'`)
- Diferenca (contrato - previsto)
- Inadimplencia (previsto - recebido)
- Comissao prevista vs recebida

**Alertas:**
- Amarelo: "Previsto difere do total do contrato"
- Vermelho: "Valores recebidos superam o previsto"
- Info: "Comissao pendente"

---

## 7. Estrutura de Arquivos

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/itemOptions.ts` | Categorias e unidades compartilhadas |
| `src/lib/paymentTypes.ts` | Tipos e constantes de pagamento |
| `src/components/contracts/ContractPaymentLinesSection.tsx` | Editor de linhas de pagamento |
| `src/components/contracts/PaymentLineRow.tsx` | Linha individual editavel |
| `src/components/contracts/PaymentSummary.tsx` | Resumo financeiro com alertas |
| `src/components/contracts/GeneratePaymentsDialog.tsx` | Modal para geracao assistida |

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/proposals/ProposalItemsSection.tsx` | Usar shared constants |
| `src/components/contracts/ContractItemsSection.tsx` | Usar shared constants |
| `src/components/contracts/ContractFormContent.tsx` | Integrar nova secao de pagamentos, remover secao antiga |
| `src/components/contracts/ContractCommissionSection.tsx` | Remover (integrado nas linhas) |
| `src/components/contracts/ContractPaymentSection.tsx` | Remover (substituido) |
| `src/pages/ContractFinancial.tsx` | Usar dados de `contract_payments` |
| `src/integrations/supabase/types.ts` | Adicionar tipos da nova tabela |

---

## 8. Fluxo de Dados

```text
                    +------------------+
                    |    Proposta      |
                    | (proposal_items) |
                    +--------+---------+
                             |
                             | Criar Contrato
                             | (copia 1:1 + normalize)
                             v
+------------------------+   +------------------------+
|      contracts         |   |    contract_items      |
| - total                |   | - category (normalized)|
| - payment_notes        |   | - unit (normalized)    |
| - commission_* (sync)  |   | - quantity, price...   |
+------------------------+   +------------------------+
                             |
                             | Ao salvar form
                             v
                    +------------------------+
                    |   contract_payments    |
                    | - kind (padronizado)   |
                    | - expected_value/date  |
                    | - received_value/date  |
                    | - status               |
                    +------------------------+
                             |
                             | Analytics
                             v
               Dashboards de fluxo de caixa
```

---

## 9. Migracao de Dados Existentes

### Estrategia

1. Novos contratos usarao `contract_payments` exclusivamente
2. Contratos existentes manterao dados em `contract_financial`
3. Script opcional (manual) para migrar dados antigos:

```sql
-- Migrar dados de contract_financial para contract_payments
INSERT INTO contract_payments (contract_id, kind, description, expected_value, expected_date, received_value, received_date, status)
SELECT 
  contract_id,
  CASE 
    WHEN type = 'recebimento' THEN 
      CASE WHEN description LIKE '%Entrada%' THEN 'entrada' ELSE 'parcela' END
    WHEN type = 'comissao' THEN 'comissao'
    ELSE 'ajuste'
  END,
  description,
  expected_value,
  expected_date,
  received_value,
  received_date,
  status
FROM contract_financial;
```

---

## 10. Sequencia de Implementacao

1. Criar `src/lib/itemOptions.ts` e `src/lib/paymentTypes.ts`
2. Atualizar `ProposalItemsSection.tsx` para usar shared constants
3. Atualizar `ContractItemsSection.tsx` para usar shared constants
4. Criar migracao para tabela `contract_payments`
5. Criar componentes de pagamento em linhas
6. Atualizar `ContractFormContent.tsx` para usar nova UX
7. Atualizar `ContractFinancial.tsx` para ler de `contract_payments`
8. Testar fluxo completo

---

## Secao Tecnica

### Tipos TypeScript

```typescript
// contract_payments table type
export interface ContractPayment {
  id: string;
  contract_id: string;
  kind: 'entrada' | 'sinal' | 'parcela' | 'ajuste' | 'comissao';
  description: string | null;
  expected_value: number;
  expected_date: string | null;
  received_value: number;
  received_date: string | null;
  status: 'pendente' | 'parcial' | 'recebido';
  order_index: number;
  notes: string | null;
  created_at: string;
}
```

### Queries Principais

```typescript
// Carregar pagamentos do contrato
const { data: payments } = await supabase
  .from('contract_payments')
  .select('*')
  .eq('contract_id', contractId)
  .order('order_index');

// Calcular totais
const totalExpected = payments
  .filter(p => p.kind !== 'comissao')
  .reduce((sum, p) => sum + p.expected_value, 0);

const totalReceived = payments
  .filter(p => p.kind !== 'comissao')
  .reduce((sum, p) => sum + p.received_value, 0);

const commissionExpected = payments
  .filter(p => p.kind === 'comissao')
  .reduce((sum, p) => sum + p.expected_value, 0);

const commissionReceived = payments
  .filter(p => p.kind === 'comissao')
  .reduce((sum, p) => sum + p.received_value, 0);
```

---

## Garantias

- Zero divergencia de categorias/unidades entre Propostas e Contratos
- Compatibilidade retroativa com dados existentes
- Fonte unica de verdade (`contract_payments`) para novos contratos
- Sincronizacao automatica com campos legados para dashboards existentes
- Nenhuma alteracao nas tabelas de relatorios
- Build sem erros garantido
