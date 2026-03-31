# Painel de Insights & Riscos — Design Spec

## Goal

New "Insights" tab in the Financeiro module that provides predictive intelligence and actionable risk alerts with direct shortcuts to resolve each issue. Replaces passive anomaly viewing with proactive, real-time operational awareness.

## Users

- **Nívea** (operator): sees pending work with SLA aging, resolves inline when possible
- **Ana Lúcia** (manager): sees budget projections, margin trends, project health at a glance

## Architecture

New page `/financeiro/insights` added to FinanceiroTabs. Three vertical blocks:

1. **Riscos Operacionais** — present-tense alerts with SLA countdown and action buttons
2. **Projeções Financeiras** — burn-rate forecasts and trend analysis per project
3. **Resolvidos Recentemente** — last 24h audit trail feed

Data updates via Supabase Realtime subscriptions (risks + resolved feed). Projections update via daily cron + on-demand recalculation.

## Tech Stack

- React + TypeScript + Tailwind + Shadcn UI (consistent with existing codebase)
- Supabase Realtime (channel subscriptions on 5 tables)
- React Query (cache invalidation on realtime events)
- PostgreSQL functions for projection calculations
- pg_cron for daily projection refresh

---

## Component 1: Riscos Operacionais

### Risk Types

| Risk | Detection Rule | Severity | Action Type |
|------|---------------|----------|-------------|
| NF-e pendente > 48h | `nfe_inbox.status = 'aguardando_revisao' AND created_at < now() - interval '48h'` | Alta (Crítica if > 5 days) | Navigate → NfeInbox |
| Conciliação atrasada > 7d | `project_financial_entries.situacao = 'pendente' AND created_at < now() - interval '7d'` | Média | Navigate → Conciliação filtered |
| Orçamento próximo do limite | `iec_atual > 0.85 AND iec_atual <= 1.0` | Média | Navigate → Indicadores filtered |
| Orçamento estourado | `iec_atual > 1.0` | Crítica | Navigate → Indicadores filtered |
| Obra sem medição > 45d | Latest `medicoes.periodo_fim < now() - interval '45d'`, project active | Alta | Navigate → Medições da obra |
| Rateio pendente > 5d | `project_financial_entries` with category prefix 'ADM', no `cost_allocations`, created > 5d ago | Média | Inline: ratear agora |
| Parcela vencida | `contract_payments.vencimento < CURRENT_DATE AND status != 'pago'` | Alta | Inline: marcar recebido / Navigate → Recebíveis |
| Obra sem orçamento | `orcamento_previsto IS NULL`, project active | Baixa | Inline: input to set budget |
| Fornecedor sem categoria | `categoria_padrao_id IS NULL` with 3+ entries | Baixa | Inline: select to assign category |

### Card Layout

Each risk card shows:
- Severity badge (color-coded: red/amber/yellow/gray)
- Description with project name and metric values
- Age indicator ("há 6 dias")
- Action button (inline or navigation with →)

Cards ordered by: severity DESC, then age DESC.

Header shows: "X riscos ativos (Y críticos)"

### SQL: View for risks

```sql
CREATE OR REPLACE VIEW v_insights_risks AS
-- Combines all 9 risk types into a unified view
-- Each row: risk_type, severity, project_id, project_name, description, age_hours, action_type, action_target, metadata
```

### Inline Actions

- **Definir orçamento**: Input field appears in card, saves to `projects.orcamento_previsto`, recalculates IEC
- **Atribuir categoria**: Select dropdown in card, saves to `suppliers.categoria_padrao_id`
- **Marcar parcela recebida**: Confirm button, updates `contract_payments.status = 'pago'`
- **Ratear lançamento**: Opens Rateio mini-dialog (project selection + method) within the card

### Navigation Actions

All navigation actions pass query params to pre-filter the target page:
- `?status=pendente` for NF-e
- `?project_id=xxx` for Indicadores/Conciliação
- `?vencido=true` for Recebíveis

---

## Component 2: Projeções Financeiras

### Calculations

```sql
CREATE OR REPLACE FUNCTION calc_project_projections(p_project_id uuid)
RETURNS jsonb
```

**Inputs:**
- `v_monthly_by_project` last 3 months of costs per project
- `projects.orcamento_previsto`, `custo_realizado`, `margem_atual`, `ifec_atual`

**Outputs (stored in `projects.projecao_json`):**

```json
{
  "burn_rate_mensal": 12400.00,
  "orcamento_restante": 15200.00,
  "meses_restantes": 1.22,
  "data_estouro_prevista": "2026-05-15",
  "tendencia_margem": "queda",
  "margem_3m": [32.1, 28.5, 24.0],
  "status": "alerta",
  "obra_parada": false,
  "ifec_status": "atencao",
  "updated_at": "2026-03-31T06:00:00Z"
}
```

**Status classification:**
- `critico`: meses_restantes < 1 OR iec > 1.0
- `alerta`: meses_restantes < 3 OR margem declining 3 months OR ifec < 0.8
- `saudavel`: everything else
- `parada`: zero entries in last 30 days, project active

### Card Layout

Each project gets a projection card:
- Status icon (red/amber/green/gray)
- Project name + headline ("Estoura em 38 dias")
- Supporting metrics (burn rate, remaining budget, margin trend)
- Action button: "Ver Financeiro →" or "Analisar com IA →"

Cards ordered: critical → alert → healthy.

"Analisar com IA" opens ChatPanel with contextual prompt about the specific project.

### Database Changes

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS projecao_json jsonb;
```

### Cron Job

Daily at 06h (alongside existing anomaly detection):

```sql
SELECT cron.schedule('calc-projections', '0 6 * * *',
  $$SELECT calc_all_projections()$$
);
```

`calc_all_projections()` iterates all active projects and calls `calc_project_projections()` for each.

---

## Component 3: Resolvidos Recentemente

### Data Source

Query `audit_log` table (already populated by triggers on all financial tables) for the last 24h.

Group by action type and show human-readable descriptions:
- "NF-e #1842 aprovada · Alvinópolis · há 2h"
- "3 lançamentos conciliados · Marcia Ramos · há 4h"
- "Rateio ADM executado · 3 obras · há 5h"
- "Orçamento definido · Belvedere R$ 280k · há 8h"

### Layout

Simple list with checkmark icon, description, and relative timestamp.
Header: "Resolvidos hoje (N)"
Collapsible "Ver mais" for items beyond the first 5.

---

## Component 4: useRealtimeInsights Hook

### Subscriptions

```typescript
const channels = [
  { table: 'nfe_inbox', events: ['UPDATE'] },
  { table: 'project_financial_entries', events: ['INSERT', 'UPDATE'] },
  { table: 'anomalias', events: ['INSERT', 'UPDATE'] },
  { table: 'cost_allocations', events: ['INSERT'] },
  { table: 'medicoes', events: ['INSERT', 'UPDATE'] },
];
```

### Behavior

On any event received:
1. Invalidate React Query cache for `insights-risks` and `insights-resolved`
2. Projections are NOT invalidated (cron-based, too expensive for realtime)
3. Show subtle "atualizado" toast or pulse animation on the updated section

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/financeiro/Insights.tsx` | Create | Main page with 3 blocks |
| `src/components/financeiro/RiscosOperacionais.tsx` | Create | Risk cards with inline actions |
| `src/components/financeiro/ProjecoesFinanceiras.tsx` | Create | Projection cards per project |
| `src/components/financeiro/ResolvidosRecentemente.tsx` | Create | Audit trail feed |
| `src/hooks/useRealtimeInsights.ts` | Create | Supabase Realtime subscriptions |
| `src/pages/financeiro/Financeiro.tsx` | Modify | Add "Insights" tab to FinanceiroTabs |
| `src/App.tsx` | Modify | Add route `/financeiro/insights` |
| `supabase/migrations/YYYYMMDD_insights.sql` | Create | v_insights_risks view, calc_project_projections(), projecao_json column, cron job |

## Navigation Integration

- New tab "Insights" in FinanceiroTabs (primary tabs, with a badge showing critical risk count)
- Navigation actions from risk cards pass query params for pre-filtering target pages
- Target pages (NfeInbox, Conciliação, Indicadores, Recebíveis, Medições) must read query params on mount and apply filters

## Out of Scope

- Email/push notifications (future enhancement)
- Historical trend charts within the Insights page (Indicadores handles this)
- Custom risk threshold configuration (hardcoded thresholds for now)
- Multi-user task assignment (no ownership model yet)
