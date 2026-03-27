# ARS Correa -- Complete Entity Relationship Map

> Generated: 2026-03-26
> Sources: `src/integrations/supabase/types.ts` + all `supabase/migrations/` files

---

## Table Inventory (27 tables)

### In types.ts (v1 -- frontend-aware)
| # | Table | Domain |
|---|-------|--------|
| 1 | clients | Comercial |
| 2 | client_files | Comercial |
| 3 | proposals | Comercial |
| 4 | proposal_items | Comercial |
| 5 | proposal_stages | Comercial |
| 6 | proposal_imports | Comercial |
| 7 | contracts | Comercial |
| 8 | contract_items | Comercial |
| 9 | contract_payments | Comercial |
| 10 | contract_financial | Comercial |
| 11 | projects | Obras |
| 12 | stages | Obras |
| 13 | stage_photos | Obras |
| 14 | project_documents | Obras |
| 15 | project_reports | Obras |
| 16 | project_costs | Obras/Financeiro (v1, legacy) |
| 17 | project_revenues | Obras/Financeiro (v1, legacy) |
| 18 | suppliers | Financeiro |
| 19 | portal_events | Portal do Cliente |
| 20 | portal_event_photos | Portal do Cliente |
| 21 | client_portal_access | Portal do Cliente |
| 22 | calendar_events | Agenda |
| 23 | calendar_event_attendees | Agenda |
| 24 | notifications | Usuarios |
| 25 | profiles | Usuarios |
| 26 | user_roles | Usuarios |

### In migrations only (v2/v3 -- NOT in types.ts)
| # | Table | Domain | Migration |
|---|-------|--------|-----------|
| 27 | financial_categories | Financeiro v2 | 20260326000100 |
| 28 | bank_accounts | Financeiro v2 | 20260326000200 |
| 29 | project_financial_entries | Financeiro v2 | 20260326000300 |
| 30 | bank_transactions | Conciliacao v3 | 20260326001000 |
| 31 | bank_reconciliations | Conciliacao v3 | 20260326001100 |
| 32 | cost_allocations | Rateio v3 | 20260326001200 |
| 33 | nfe_inbox | NF-e v3 | 20260327000200 |

---

## Complete FK Relationship List

### 1. Comercial (Clientes -> Propostas -> Contratos)

```
clients.id <- proposals.client_id                    (1:N)
clients.id <- contracts.client_id                    (1:N)
clients.id <- client_files.client_id                 (1:N)
clients.id <- proposal_imports.client_id             (1:N)
clients.id <- projects.client_id                     (1:N)
clients.id <- client_portal_access.client_id         (1:N)

proposals.id <- proposal_items.proposal_id           (1:N)
proposals.id <- contracts.proposal_id                (1:N)
proposals.id <- proposal_imports.proposal_id         (1:N)
proposals.client_id -> clients.id                    (N:1)
proposals.project_id -> projects.id                  (N:1, nullable)
proposals.stage_id -> proposal_stages.id             (N:1, nullable)

contracts.id <- contract_items.contract_id           (1:N)
contracts.id <- contract_payments.contract_id        (1:N)
contracts.id <- contract_financial.contract_id       (1:N)
contracts.client_id -> clients.id                    (N:1)
contracts.proposal_id -> proposals.id                (N:1)
contracts.project_id -> projects.id                  (N:1, nullable)
```

```
clients ──1:N──> proposals ──1:N──> proposal_items
   |                 |
   |                 |──N:1──> proposal_stages
   |                 |
   |                 └──1:N──> contracts ──1:N──> contract_items
   |                               |
   |                               |──1:N──> contract_payments
   |                               |             |
   |                               |             └──1:1──> project_financial_entries
   |                               |                       (via contract_payment_id)
   |                               |
   |                               └──1:N──> contract_financial
   |
   |──1:N──> client_files
   |
   |──1:N──> proposal_imports ──N:1──> proposals
   |
   └──1:N──> projects
```

### 2. Obras (Projetos -> Etapas -> Diario)

```
projects.id <- stages.project_id                     (1:N)
projects.id <- project_documents.project_id          (1:N)
projects.id <- project_reports.project_id            (1:N)
projects.id <- project_costs.project_id              (1:N, legacy v1)
projects.id <- project_revenues.project_id           (1:N, legacy v1)
projects.id <- project_financial_entries.project_id  (1:N, v2)
projects.id <- cost_allocations.project_id           (1:N, v3)
projects.id <- portal_events.project_id              (1:N)
projects.id <- client_portal_access.project_id       (1:N)
projects.id <- contracts.project_id                  (1:N, nullable)
projects.id <- proposals.project_id                  (1:N, nullable)
projects.id <- nfe_inbox.project_id_selecionado      (1:N, nullable, v3)
projects.client_id -> clients.id                     (N:1)
projects.bank_account_id -> bank_accounts.id         (N:1, nullable, v2)

stages.id <- stage_photos.stage_id                   (1:N)
stages.project_id -> projects.id                     (N:1)
```

```
projects ──1:N──> stages ──1:N──> stage_photos
    |
    |──1:N──> project_documents
    |
    |──1:N──> project_reports
    |
    |──1:N──> project_costs (v1 legacy)
    |
    |──1:N──> project_revenues (v1 legacy)
    |
    |──1:N──> project_financial_entries (v2)
    |              |
    |              |──N:1──> bank_accounts
    |              |──N:1──> financial_categories
    |              |──N:1──> suppliers (nullable)
    |              |──N:1──> profiles (created_by, nullable)
    |              └──N:1──> contract_payments (nullable)
    |
    |──1:N──> cost_allocations (v3 rateio)
    |
    |──N:1──> bank_accounts (nullable, v2)
    |
    └──N:1──> clients
```

### 3. Financeiro (Lancamentos -> Categorias -> Contas -> Fornecedores)

```
project_financial_entries.project_id -> projects.id               (N:1, ON DELETE CASCADE)
project_financial_entries.bank_account_id -> bank_accounts.id     (N:1)
project_financial_entries.category_id -> financial_categories.id  (N:1)
project_financial_entries.supplier_id -> suppliers.id             (N:1, nullable)
project_financial_entries.created_by -> profiles.id               (N:1, nullable)
project_financial_entries.contract_payment_id -> contract_payments.id (N:1, nullable)

project_financial_entries.id <- bank_transactions.lancamento_id   (1:N, ON DELETE SET NULL)
project_financial_entries.id <- bank_reconciliations.lancamento_id (1:N, ON DELETE CASCADE)
project_financial_entries.id <- cost_allocations.lancamento_id    (1:N, ON DELETE CASCADE)
project_financial_entries.id <- nfe_inbox.financial_entry_id      (1:N, ON DELETE SET NULL)

suppliers.id <- project_costs.supplier_id                         (1:N, v1 legacy)
suppliers.id <- project_financial_entries.supplier_id             (1:N, v2)
suppliers.id <- nfe_inbox.supplier_id                             (1:N, v3)
suppliers.categoria_padrao_id -> financial_categories.id          (N:1, nullable, v2)

financial_categories.id <- project_financial_entries.category_id  (1:N)
financial_categories.id <- suppliers.categoria_padrao_id          (1:N, nullable)

bank_accounts.id <- project_financial_entries.bank_account_id     (1:N)
bank_accounts.id <- bank_transactions.bank_account_id            (1:N)
bank_accounts.id <- projects.bank_account_id                     (1:N, nullable)
bank_accounts.id <- nfe_inbox.bank_account_id_selecionado        (1:N, nullable)
```

```
financial_categories <──N:1── project_financial_entries ──N:1──> bank_accounts
                                       |        |
                   suppliers <──N:1────┘        |──N:1──> projects
                       |                        |
                       └──N:1──> financial_categories
                         (categoria_padrao_id)

project_financial_entries is the CENTRAL TABLE of the v2 financial model.
It has 5 inbound FKs and 5 outbound FKs.
```

### 4. NF-e (Inbox -> Fornecedores -> Lancamentos)

```
nfe_inbox.supplier_id -> suppliers.id                              (N:1, nullable)
nfe_inbox.project_id_selecionado -> projects.id                    (N:1, nullable)
nfe_inbox.bank_account_id_selecionado -> bank_accounts.id          (N:1, nullable)
nfe_inbox.financial_entry_id -> project_financial_entries.id        (N:1, nullable, ON DELETE SET NULL)
nfe_inbox.revisado_por -> profiles.id                              (N:1, nullable)
```

```
                  suppliers
                      ^
                      |N:1
nfe_inbox ──N:1──> projects
    |
    |──N:1──> bank_accounts
    |
    |──N:1──> project_financial_entries
    |
    └──N:1──> profiles (revisado_por)
```

NF-e flow: email/upload -> nfe_inbox (recebido) -> AI categorization ->
human review -> approve -> creates project_financial_entries row ->
financial_entry_id links back.

### 5. Conciliacao (Transacoes bancarias -> Reconciliacoes -> Lancamentos)

```
bank_transactions.bank_account_id -> bank_accounts.id              (N:1)
bank_transactions.lancamento_id -> project_financial_entries.id     (N:1, nullable, ON DELETE SET NULL)

bank_reconciliations.transaction_id -> bank_transactions.id         (N:1)
bank_reconciliations.lancamento_id -> project_financial_entries.id   (N:1, ON DELETE CASCADE)
bank_reconciliations.criado_por -> profiles.id                      (N:1, nullable)
```

```
bank_accounts ──1:N──> bank_transactions ──1:N──> bank_reconciliations
                              |                          |
                              └──N:1──> project_     <───┘
                                     financial_entries
```

Reconciliation flow: CSV import -> bank_transactions (pendente) ->
match to project_financial_entries -> bank_reconciliations row ->
both sides marked conciliado.

### 6. Rateio (Alocacoes -> Lancamentos -> Projetos)

```
cost_allocations.lancamento_id -> project_financial_entries.id     (N:1, ON DELETE CASCADE)
cost_allocations.project_id -> projects.id                         (N:1)
cost_allocations.criado_por -> profiles.id                         (N:1, nullable)
```

```
project_financial_entries ──1:N──> cost_allocations ──N:1──> projects
         (entry from project A)            (allocated to project B)
```

Rateio allows a single ADM-category expense to be split across
multiple projects by percentage.

### 7. Portal do Cliente

```
portal_events.project_id -> projects.id                            (N:1)
portal_event_photos.event_id -> portal_events.id                   (N:1)
client_portal_access.client_id -> clients.id                       (N:1)
client_portal_access.project_id -> projects.id                     (N:1)
```

```
clients ──1:N──> client_portal_access ──N:1──> projects
                                                   |
                                                   └──1:N──> portal_events ──1:N──> portal_event_photos
```

### 8. Agenda

```
calendar_event_attendees.event_id -> calendar_events.id            (N:1)
```

```
calendar_events ──1:N──> calendar_event_attendees
```

Note: calendar_events.created_by is a UUID referencing auth.users but
has NO declared FK in the schema. Same for calendar_event_attendees.user_id.

### 9. Usuarios / Auth

```
profiles.id -> auth.users.id                                       (1:1, implicit)
user_roles.user_id -> auth.users.id                                (N:1, implicit)
notifications.user_id -> auth.users.id                             (N:1, implicit)
```

```
auth.users ──1:1──> profiles
    |
    |──1:N──> user_roles (admin | client | financeiro)
    |
    └──1:N──> notifications
```

Note: profiles, user_roles, and notifications reference auth.users.id
but the FKs are not declared in types.ts Relationships arrays. They
are likely enforced via RLS policies or Supabase auth triggers, not
explicit FOREIGN KEY constraints visible to PostgREST.

---

## Cascade Behavior Summary

| FK | ON DELETE | Notes |
|----|-----------|-------|
| project_financial_entries.project_id -> projects | CASCADE | Deleting project deletes all entries |
| bank_reconciliations.lancamento_id -> project_financial_entries | CASCADE | Migration 20260327001100 |
| cost_allocations.lancamento_id -> project_financial_entries | CASCADE | Migration 20260327001100 |
| nfe_inbox.financial_entry_id -> project_financial_entries | SET NULL | Keeps NF-e history |
| bank_transactions.lancamento_id -> project_financial_entries | SET NULL | Unlinks, reverts to pendente |
| All other FKs | RESTRICT (default) | PostgreSQL default behavior |

---

## Broken / Missing Relationships

### 1. calendar_events.created_by -- NO FK to profiles or auth.users
The column exists and stores a UUID, but there is no FOREIGN KEY constraint.
If the creating user is deleted, orphan events will remain.

### 2. calendar_event_attendees.user_id -- NO FK to profiles or auth.users
Same issue. Attendees reference users by UUID without a constraint.

### 3. notifications.user_id -- NO FK to profiles or auth.users
Notifications can reference nonexistent users.

### 4. portal_events.user_id -- NO FK to profiles or auth.users
Portal events track which user created them, but no FK constraint.

### 5. portal_events.responded_by -- NO FK to profiles or auth.users
Admin who responded is a bare UUID.

### 6. client_portal_access.user_id -- NO FK
The portal access row references a user but has no FK.

### 7. client_portal_access.created_by -- NO FK
Same issue.

### 8. contracts.created_by -- NO FK
The contract creator is stored as UUID with no FK.

### 9. proposals.created_by -- NO FK
Same issue.

### 10. proposal_imports.created_by -- NO FK to profiles (missing from Relationships)
UUID reference without constraint.

### 11. project_documents.uploaded_by -- NO FK
Same pattern.

### 12. project_costs -> project_financial_entries -- NO LINK
The v1 legacy table `project_costs` is completely disconnected from the
v2 `project_financial_entries`. There is no migration path or FK between
them. Both can coexist for the same project with no deduplication guard.

### 13. project_revenues -> project_financial_entries -- NO LINK
Same issue. Legacy revenue tracking is disconnected from v2 entries.

### 14. contract_payments -> project_financial_entries -- WEAK LINK
The `contract_payment_id` column was added to `project_financial_entries`
(migration 20260327002000), but there is no reverse FK from
`contract_payments` to know which entry fulfilled it. The link is
optional and one-directional.

### 15. proposals.project_id -- BIDIRECTIONAL AMBIGUITY
A proposal can reference a project, AND a contract (born from a proposal)
can also reference a project. This creates two paths from proposal to
project: `proposals.project_id` and `proposals -> contracts.project_id`.
They can point to different projects.

---

## Orphan Tables (no FK relationships at all)

| Table | Issue |
|-------|-------|
| proposal_stages | Referenced BY proposals.stage_id, but has no outbound FKs itself. This is normal for a lookup/config table. |
| financial_categories | Referenced BY entries and suppliers, but has no outbound FKs. Normal for a lookup table. |
| bank_accounts | Referenced BY entries, transactions, projects, nfe_inbox. No outbound FKs. Normal for a config table. |

These are **leaf/lookup tables** -- not truly orphaned, just terminal nodes
in the relationship graph. There are **no actually orphaned tables** with
zero inbound AND zero outbound FKs.

---

## Circular Dependencies

**None found.** The relationship graph is a DAG (directed acyclic graph).

The closest thing to a cycle is:

```
proposals.project_id -> projects
contracts.proposal_id -> proposals
contracts.project_id -> projects
```

This is a diamond, not a cycle. Both proposals and contracts can independently
reference the same or different projects.

---

## Full Relationship Graph (All Domains)

```
                                    auth.users (implicit)
                                    /    |     \
                                   /     |      \
                              profiles  user_roles  notifications
                                |
          +---------------------+-----------------------------+
          |                     |                             |
    calendar_events    project_financial_entries          nfe_inbox
          |              /    |    |    \    \               / | \
  cal_event_attendees   /     |    |     \    \            /  |  \
                       /      |    |      \    \          /   |   \
               projects  bank_accts categories suppliers  projects bank_accts
                 / | \
                /  |  \
         stages  docs  reports   contract_payments
           |                        |
     stage_photos              (contract_payment_id
                                in fin. entries)

  clients ──> proposals ──> contracts ──> contract_items
     |            |             |
     |       proposal_items    contract_payments
     |                         contract_financial
     |
     |──> client_files
     |──> client_portal_access ──> projects
     |
     └──> projects ──> portal_events ──> portal_event_photos
                |
                |──> project_costs ──> suppliers (v1 legacy)
                |──> project_revenues (v1 legacy)
                |
                |──> project_financial_entries (v2 central)
                |         |
                |         |──> bank_transactions (conciliacao)
                |         |         |
                |         |    bank_reconciliations
                |         |
                |         └──> cost_allocations (rateio)
                |                   |
                |                   └──> projects (target)
                |
                └──> nfe_inbox (v3)
```

---

## Key Metrics

- **Total tables**: 33
- **Total FK relationships**: 42
- **Central hub table**: `projects` (13 inbound FKs -- most connected)
- **Second hub**: `project_financial_entries` (10 FKs total -- 5 in, 5 out)
- **Third hub**: `clients` (6 inbound FKs)
- **Missing user FKs**: 10 columns reference auth.users without constraints
- **Legacy/v2 overlap**: project_costs + project_revenues coexist with project_financial_entries
- **Cascade deletes**: 3 (project->entries, entries->reconciliations, entries->allocations)
- **Set null on delete**: 2 (entries->nfe_inbox, entries->bank_transactions)
