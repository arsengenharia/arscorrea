

# Plano: Relatorio Gerencial por Obra (Backend + Banco de Dados)

## Resumo
Criar as tabelas de custos, receitas e relatorios gerenciais no banco de dados, adicionar coluna `peso_etapa` na tabela `stages`, e desenvolver uma edge function que consolida todos os dados do relatorio gerencial de uma obra.

## 1. Modificacoes no Banco de Dados (Migration SQL)

### 1.1 Nova tabela: `project_costs` (obras_custos)
| Coluna | Tipo | Observacoes |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| project_id | UUID FK -> projects.id | NOT NULL |
| cost_type | text | 'Direto' ou 'Indireto' |
| description | text | Opcional |
| expected_value | numeric | DEFAULT 0 |
| actual_value | numeric | DEFAULT 0 |
| record_date | date | Opcional |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 1.2 Nova tabela: `project_revenues` (obras_receitas)
| Coluna | Tipo | Observacoes |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| project_id | UUID FK -> projects.id | NOT NULL |
| revenue_type | text | 'Contrato', 'Aditivo', etc. |
| description | text | Opcional |
| expected_value | numeric | DEFAULT 0 |
| actual_value | numeric | DEFAULT 0 |
| record_date | date | Opcional |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 1.3 Nova tabela: `project_reports` (obras_relatorios_gerenciais)
| Coluna | Tipo | Observacoes |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| project_id | UUID FK -> projects.id | NOT NULL |
| generated_at | timestamptz | DEFAULT now() |
| observations | text | Opcional |
| pdf_path | text | Opcional |
| report_data | jsonb | Dados consolidados |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 1.4 Alteracao na tabela `stages`
- Adicionar coluna `stage_weight` (numeric, NOT NULL, DEFAULT 0) - peso percentual da etapa (ex: 0.10 = 10%)

### 1.5 RLS
Todas as 3 novas tabelas terao RLS habilitado com politicas para usuarios autenticados (SELECT, INSERT, UPDATE, DELETE), seguindo o padrao existente no projeto.

### 1.6 Trigger updated_at
As 3 novas tabelas usarao o trigger `update_updated_at_column()` ja existente.

## 2. Edge Function: `project-management-report`

### Endpoint
`POST /functions/v1/project-management-report`
- Body: `{ "project_id": "uuid" }`
- Retorna o JSON consolidado do relatorio

### Logica de Calculo

**IFEC (Indice Fisico de Etapas Concluidas)**
- Etapas concluidas (status = 'concluido') / Total de etapas * 100

**IEC (Indice de Eficiencia de Cronograma)**
- Soma de `stage_weight` das etapas concluidas / Soma de `stage_weight` das etapas que deveriam estar concluidas ate hoje (baseado em `report_end_date <= hoje`) * 100

**Producao Fisica Mensal/Acumulada**
- Agrupa etapas por mes usando `report_end_date` e calcula previsto vs real com base no `stage_weight`

**Analise Financeira**
- Custos: soma de `expected_value` e `actual_value` da tabela `project_costs`, agrupados por `cost_type`
- Receitas: soma de `expected_value` e `actual_value` da tabela `project_revenues`
- Saldo = Receita Real - Custo Real
- Margem = (Saldo / Receita Real) * 100

### Estrutura do JSON de Retorno
```text
{
  "obra": { id, nome, gestor, data_inicio, data_conclusao_prevista, prazo_dias, status },
  "cliente": { nome, codigo, responsavel, telefone, endereco },
  "analise_fisica": {
    "ifec": { valor, descricao },
    "iec": { valor, descricao },
    "producao_mensal": [...],
    "producao_acumulada": [...]
  },
  "analise_financeira": {
    "custo_total_previsto", "custo_direto_previsto", "custo_indireto_previsto",
    "custo_total_real", "custo_direto_real", "custo_indireto_real",
    "variacao_custo", "receita_total_prevista", "receita_total_realizada",
    "variacao_receita", "saldo_obra", "margem_lucro"
  },
  "observacoes_gerenciais": ""
}
```

## 3. Frontend (pagina de visualizacao)

### Nova pagina: `src/pages/ProjectReport.tsx`
- Rota: `/obras/:projectId/relatorio`
- Busca dados chamando a edge function
- Exibe cards com KPIs fisicos (IFEC, IEC)
- Exibe graficos de producao mensal/acumulada (Recharts)
- Exibe cards financeiros (custos, receitas, saldo, margem)
- Campo de observacoes gerenciais

### Nova pagina: `src/pages/ProjectCosts.tsx`
- Rota: `/obras/:projectId/custos`
- CRUD de custos da obra (tabela `project_costs`)
- Formulario para adicionar/editar custos com tipo, descricao, valores

### Nova pagina: `src/pages/ProjectRevenues.tsx`
- Rota: `/obras/:projectId/receitas`
- CRUD de receitas da obra (tabela `project_revenues`)

### Alteracoes em `src/pages/ProjectDetails.tsx`
- Adicionar botoes de navegacao para "Relatorio Gerencial", "Custos" e "Receitas"

### Alteracoes em `src/components/projects/ProjectForm.tsx` e `EditStageForm.tsx` / `StageForm.tsx`
- Adicionar campo `stage_weight` (peso da etapa) no formulario de etapas

### Rotas em `src/App.tsx`
- `/obras/:projectId/relatorio`
- `/obras/:projectId/custos`
- `/obras/:projectId/receitas`

## 4. Sequencia de Implementacao

1. Migration SQL (3 tabelas + coluna `stage_weight` + RLS + triggers)
2. Edge function `project-management-report`
3. Formularios de custos e receitas (CRUD)
4. Campo `stage_weight` nos formularios de etapas
5. Pagina do relatorio gerencial com graficos e KPIs
6. Rotas no App.tsx e botoes de navegacao no ProjectDetails

## Arquivos a Criar/Modificar
1. **Migration SQL** (nova)
2. **`supabase/functions/project-management-report/index.ts`** (novo)
3. **`src/pages/ProjectReport.tsx`** (novo)
4. **`src/pages/ProjectCosts.tsx`** (novo)
5. **`src/pages/ProjectRevenues.tsx`** (novo)
6. **`src/pages/StageForm.tsx`** (editar - campo peso)
7. **`src/pages/EditStageForm.tsx`** (editar - campo peso)
8. **`src/pages/ProjectDetails.tsx`** (editar - botoes navegacao)
9. **`src/App.tsx`** (editar - novas rotas)

