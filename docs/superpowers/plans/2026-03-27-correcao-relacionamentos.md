# Correção de Relacionamentos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os problemas de relacionamento identificados no mapa de entidades — eliminar tabelas legacy, adicionar FKs faltantes, resolver ambiguidades, e garantir integridade referencial completa.

**Architecture:** 5 etapas independentes, cada uma produzindo software funcional. Etapa 1 (legacy cleanup) é a mais impactante. Etapas 2-5 são melhorias de integridade.

**Tech Stack:** PostgreSQL (Supabase), React, TypeScript.

---

## Diagnóstico (do ENTITY-RELATIONSHIPS.md)

| # | Problema | Severidade | Etapa |
|---|---|---|---|
| 1 | `project_costs` e `project_revenues` (v0) coexistem com `project_financial_entries` (v2) sem link — dados divergentes | CRÍTICO | 1 |
| 2 | `contract_financial` redundante (já depreciado na UI, mas tabela ainda ativa) | ALTO | 1 |
| 3 | 10 colunas `user_id`/`created_by` sem FK real para `auth.users` ou `profiles` | MÉDIO | 2 |
| 4 | `proposals.project_id` e `contracts.project_id` podem divergir (diamante) | MÉDIO | 3 |
| 5 | Rotas legacy `/obras/:id/custos` e `/obras/:id/receitas` ainda acessíveis | BAIXO | 4 |
| 6 | `types.ts` desatualizado — 7 tabelas v2/v3 sem tipagem | ALTO | 5 |

---

## Etapa 1: Eliminar Tabelas Legacy (CRÍTICO)

**Problema:** `project_costs`, `project_revenues` e `contract_financial` são tabelas da v0/v1 que foram substituídas por `project_financial_entries` (v2). Elas ainda existem no banco, o código antigo ainda as referencia em alguns lugares, e não há migração de dados entre elas.

### Task 1.1: Migrar dados de project_costs → project_financial_entries

**Files:**
- Create: `supabase/migrations/20260327003000_migrate_legacy_costs.sql`

- [ ] **Step 1: Write the migration**

Esta migration copia dados de `project_costs` para `project_financial_entries` onde ainda não existam (evitando duplicatas). Depois marca as tabelas como deprecated com um comentário.

```sql
-- Migrate legacy project_costs to project_financial_entries
-- Only migrate rows that don't already have a matching entry (by project + date + value)
INSERT INTO project_financial_entries (
  project_id, bank_account_id, category_id, data, valor,
  tipo_documento, situacao, observacoes, created_at
)
SELECT
  pc.project_id,
  -- Use project's default bank account, or first active account
  COALESCE(p.bank_account_id, (SELECT id FROM bank_accounts WHERE ativo = true LIMIT 1)),
  -- Map cost_type to category
  CASE
    WHEN pc.cost_type = 'Direto' THEN (SELECT id FROM financial_categories WHERE codigo = 'materiais_obra' LIMIT 1)
    WHEN pc.cost_type = 'Indireto' THEN (SELECT id FROM financial_categories WHERE codigo = 'custo_administrativo' LIMIT 1)
    ELSE (SELECT id FROM financial_categories WHERE codigo = 'materiais_obra' LIMIT 1)
  END,
  COALESCE(pc.record_date, pc.created_at::date),
  -ABS(COALESCE(pc.actual_value, pc.expected_value, 0)),  -- negative = cost
  'Outros',
  'pendente',
  CONCAT('Migrado de project_costs: ', COALESCE(pc.description, pc.cost_type)),
  pc.created_at
FROM project_costs pc
JOIN projects p ON p.id = pc.project_id
WHERE COALESCE(pc.actual_value, pc.expected_value, 0) != 0
AND NOT EXISTS (
  SELECT 1 FROM project_financial_entries pfe
  WHERE pfe.project_id = pc.project_id
    AND pfe.data = COALESCE(pc.record_date, pc.created_at::date)
    AND ABS(pfe.valor) = ABS(COALESCE(pc.actual_value, pc.expected_value, 0))
    AND pfe.observacoes LIKE '%Migrado de project_costs%'
);

-- Migrate legacy project_revenues to project_financial_entries
INSERT INTO project_financial_entries (
  project_id, bank_account_id, category_id, data, valor,
  tipo_documento, situacao, observacoes, created_at
)
SELECT
  pr.project_id,
  COALESCE(p.bank_account_id, (SELECT id FROM bank_accounts WHERE ativo = true LIMIT 1)),
  (SELECT id FROM financial_categories WHERE codigo = 'aporte_clientes' LIMIT 1),
  COALESCE(pr.record_date, pr.created_at::date),
  ABS(COALESCE(pr.actual_value, pr.expected_value, 0)),  -- positive = revenue
  'Outros',
  'pendente',
  CONCAT('Migrado de project_revenues: ', COALESCE(pr.description, pr.revenue_type)),
  pr.created_at
FROM project_revenues pr
JOIN projects p ON p.id = pr.project_id
WHERE COALESCE(pr.actual_value, pr.expected_value, 0) != 0
AND NOT EXISTS (
  SELECT 1 FROM project_financial_entries pfe
  WHERE pfe.project_id = pr.project_id
    AND pfe.data = COALESCE(pr.record_date, pr.created_at::date)
    AND ABS(pfe.valor) = ABS(COALESCE(pr.actual_value, pr.expected_value, 0))
    AND pfe.observacoes LIKE '%Migrado de project_revenues%'
);

-- Recalculate balances for all affected projects
DO $$
DECLARE
  proj RECORD;
BEGIN
  FOR proj IN SELECT DISTINCT id FROM projects LOOP
    PERFORM calc_project_balance(proj.id);
  END LOOP;
END $$;

-- Mark legacy tables as deprecated (don't drop — preserve for audit)
COMMENT ON TABLE project_costs IS 'DEPRECATED v0 — dados migrados para project_financial_entries em 2026-03-27. NÃO usar para novos dados.';
COMMENT ON TABLE project_revenues IS 'DEPRECATED v0 — dados migrados para project_financial_entries em 2026-03-27. NÃO usar para novos dados.';
COMMENT ON TABLE contract_financial IS 'DEPRECATED v1 — substituído por contract_payments + project_financial_entries. NÃO usar para novos dados.';
```

- [ ] **Step 2: Apply migration**

- [ ] **Step 3: Verify** — check that project balances are correct after migration

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260327003000_migrate_legacy_costs.sql
git commit -m "feat(db): migrate legacy project_costs/revenues to project_financial_entries"
```

### Task 1.2: Remove legacy references from frontend

**Files:**
- Modify: `src/App.tsx` — remove/redirect legacy routes
- Modify: `src/pages/Index.tsx` — remove imports of legacy pages if any
- Verify: `src/hooks/use-dashboard-metrics.ts` — already migrated in P0-b (confirm)

- [ ] **Step 1: Update App.tsx**

Remove or redirect the legacy routes:
```tsx
// REMOVE these routes:
<Route path="/obras/:projectId/custos" ... />
<Route path="/obras/:projectId/receitas" ... />

// ADD redirects for bookmarks:
<Route path="/obras/:projectId/custos" element={<Navigate to={`/obras/${projectId}/lancamentos`} replace />} />
<Route path="/obras/:projectId/receitas" element={<Navigate to={`/obras/${projectId}/lancamentos`} replace />} />
```

Wait — React Router can't interpolate params in Navigate. Use a component:

```tsx
// Create a simple redirect component inline:
function RedirectToLancamentos() {
  const { projectId } = useParams();
  return <Navigate to={`/obras/${projectId}/lancamentos`} replace />;
}

// Then in routes:
<Route path="/obras/:projectId/custos" element={<ProtectedRoute><RedirectToLancamentos /></ProtectedRoute>} />
<Route path="/obras/:projectId/receitas" element={<ProtectedRoute><RedirectToLancamentos /></ProtectedRoute>} />
```

Remove imports of `ProjectCosts` and `ProjectRevenues` from App.tsx.

- [ ] **Step 2: Verify no other files import legacy pages**

```bash
grep -r "ProjectCosts\|ProjectRevenues\|project_costs\|project_revenues" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found:
- `use-dashboard-metrics.ts` — should already be migrated (P0-b). If still references legacy, remove.
- Any other file — remove legacy references.

- [ ] **Step 3: Build and commit**

```bash
cd /tmp/arscorrea && npm run build
git add -A
git commit -m "refactor: remove legacy project_costs/revenues routes, redirect to lancamentos"
```

---

## Etapa 2: Adicionar FKs de Usuário (MÉDIO)

**Problema:** 10 colunas armazenam UUIDs de auth.users sem constraint FK. Se um usuário for deletado, essas referências ficam órfãs.

### Task 2.1: Add user FK constraints

**Files:**
- Create: `supabase/migrations/20260327003100_add_user_fks.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add FK constraints for user references
-- Using profiles table (not auth.users directly — profiles is the public-facing user table)
-- All FKs are optional (nullable) with ON DELETE SET NULL to prevent cascade deletion of user data

-- calendar_events
ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- portal_events (user_id = who created)
DO $$ BEGIN
  ALTER TABLE portal_events
    ADD CONSTRAINT portal_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- portal_events (responded_by)
DO $$ BEGIN
  ALTER TABLE portal_events
    ADD CONSTRAINT portal_events_responded_by_fkey
    FOREIGN KEY (responded_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_portal_access
DO $$ BEGIN
  ALTER TABLE client_portal_access
    ADD CONSTRAINT client_portal_access_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contracts
DO $$ BEGIN
  ALTER TABLE contracts
    ADD CONSTRAINT contracts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_documents
DO $$ BEGIN
  ALTER TABLE project_documents
    ADD CONSTRAINT project_documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

Note: `proposals.created_by` and `proposal_imports.created_by` may not exist as columns. Check before adding. `notifications.user_id` references auth.users directly (for Supabase Realtime) — don't constrain it to profiles.

- [ ] **Step 2: Apply and verify**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327003100_add_user_fks.sql
git commit -m "feat(db): add missing FK constraints for user references (ON DELETE SET NULL)"
```

---

## Etapa 3: Resolver Ambiguidade proposals↔contracts↔projects (MÉDIO)

**Problema:** `proposals.project_id` e `contracts.project_id` podem apontar para projetos diferentes. Quando um contrato é criado a partir de uma proposta, o `project_id` deveria ser herdado automaticamente.

### Task 3.1: Add validation trigger

**Files:**
- Create: `supabase/migrations/20260327003200_validate_contract_project.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Ensure contracts.project_id is consistent with proposals.project_id
-- When a contract is created from a proposal that already has a project_id,
-- the contract should inherit it (or they must match if both are set)

CREATE OR REPLACE FUNCTION validate_contract_project_consistency()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_proposal_project_id uuid;
BEGIN
  -- Only validate if contract has a proposal_id
  IF NEW.proposal_id IS NOT NULL THEN
    SELECT project_id INTO v_proposal_project_id
    FROM proposals WHERE id = NEW.proposal_id;

    -- If proposal has a project and contract doesn't, auto-fill
    IF v_proposal_project_id IS NOT NULL AND NEW.project_id IS NULL THEN
      NEW.project_id := v_proposal_project_id;
    END IF;

    -- If both have project_id and they differ, raise error
    IF v_proposal_project_id IS NOT NULL AND NEW.project_id IS NOT NULL
       AND v_proposal_project_id != NEW.project_id THEN
      RAISE EXCEPTION 'Contract project_id (%) differs from proposal project_id (%). They must match.',
        NEW.project_id, v_proposal_project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contract_project
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION validate_contract_project_consistency();
```

- [ ] **Step 2: Apply and verify**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327003200_validate_contract_project.sql
git commit -m "feat(db): add trigger to validate contract-proposal project consistency"
```

---

## Etapa 4: Limpar Rotas Obsoletas (BAIXO)

**Problema:** As páginas `ProjectCosts.tsx` e `ProjectRevenues.tsx` ainda existem como arquivos. Os botões na UI já foram removidos (substituídos por Lançamentos/Financeiro), mas os arquivos ocupam espaço e podem confundir futuros desenvolvedores.

### Task 4.1: Archive legacy page files

**Files:**
- Move/delete: `src/pages/ProjectCosts.tsx`
- Move/delete: `src/pages/ProjectRevenues.tsx`

- [ ] **Step 1: Remove the files**

```bash
rm src/pages/ProjectCosts.tsx src/pages/ProjectRevenues.tsx
```

- [ ] **Step 2: Remove imports from App.tsx**

Remove:
```typescript
import ProjectCosts from "./pages/ProjectCosts";
import ProjectRevenues from "./pages/ProjectRevenues";
```

The redirect routes (from Etapa 1) should use inline Navigate, not these components.

- [ ] **Step 3: Search for any remaining imports**

```bash
grep -r "ProjectCosts\|ProjectRevenues" src/ --include="*.tsx" --include="*.ts"
```

Fix any found.

- [ ] **Step 4: Build and commit**

```bash
cd /tmp/arscorrea && npm run build
git add -A
git commit -m "cleanup: remove legacy ProjectCosts and ProjectRevenues pages"
```

---

## Etapa 5: Regenerar types.ts (ALTO)

**Problema:** O arquivo `src/integrations/supabase/types.ts` não contém as 7 tabelas v2/v3: `financial_categories`, `bank_accounts`, `project_financial_entries`, `bank_transactions`, `bank_reconciliations`, `cost_allocations`, `nfe_inbox`. Todo o código v2/v3 usa `as any` para contornar.

### Task 5.1: Regenerate types

- [ ] **Step 1: Install Supabase CLI if needed**

```bash
npx supabase --version || npm install -g supabase
```

- [ ] **Step 2: Login and generate types**

```bash
npx supabase login --token sbp_01634453ae09535fd9459de8ca1935442c403430
npx supabase gen types typescript --project-id qajzskxuvxsbvuyuvlnd > src/integrations/supabase/types.ts
```

- [ ] **Step 3: Verify the new types include v2/v3 tables**

```bash
grep -c "financial_categories\|bank_accounts\|project_financial_entries\|bank_transactions\|bank_reconciliations\|cost_allocations\|nfe_inbox" src/integrations/supabase/types.ts
```

Expected: 7+ matches.

- [ ] **Step 4: Remove `as any` casts**

Search and fix the most common patterns:
```bash
grep -rn "as any" src/ --include="*.tsx" --include="*.ts" | grep -i "supabase\|from(" | head -30
```

For each occurrence like `supabase.from("financial_categories" as any)`, change to `supabase.from("financial_categories")`.

This is a large refactor (50+ occurrences). Can be done incrementally — the `as any` casts don't break anything, they just lose type safety.

- [ ] **Step 5: Build and commit**

```bash
cd /tmp/arscorrea && npm run build
git add src/integrations/supabase/types.ts
git commit -m "chore: regenerate Supabase types with v2/v3 tables"
```

---

## Resumo

| Etapa | O que | Impacto | Esforço | Dependência |
|---|---|---|---|---|
| 1 | Migrar dados legacy + remover rotas | Elimina divergência de dados | Médio | Nenhuma |
| 2 | FKs de usuário | Integridade referencial | Baixo | Nenhuma |
| 3 | Trigger validação contrato↔proposta | Previne inconsistência | Baixo | Nenhuma |
| 4 | Remover arquivos legacy | Limpeza de código | Trivial | Etapa 1 |
| 5 | Regenerar types.ts | Elimina `as any` | Médio-Alto | Todas as migrations aplicadas |

**Total: 5 etapas, ~12 tasks, pode ser executado em sequência.**

Etapas 1-3 são independentes e podem rodar em paralelo. Etapa 4 depende de 1. Etapa 5 é a última (precisa de todas as migrations aplicadas).
