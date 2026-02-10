

# Analise de Viabilidade: Etapa 3 - Torre de Controle (Dashboard)

## Diagnostico do Estado Atual

O sistema ja possui um dashboard funcional na rota `/` (Index.tsx) com:
- Filtros temporais (Hoje, 7d, 30d, Mes, Personalizado)
- Aba Comercial: KPIs (propostas abertas, taxa conversao, ticket medio), funil de propostas, aging, mapa com Google Maps, tabela de propostas antigas
- Aba Financeiro: KPIs (valores abertos, recebidos, vencidos, comissoes), fluxo de caixa semanal, aging de inadimplencia, proximos vencimentos
- Biblioteca Recharts ja instalada e em uso
- Google Maps ja integrado (@vis.gl/react-google-maps)

---

## O que ja existe e NAO precisa ser reimplementado

| Item solicitado | Status |
|---|---|
| Filtros de periodo | Ja implementado |
| KPIs Comerciais (propostas, conversao, ticket) | Ja implementado |
| KPIs Financeiros (aberto, recebido, vencido, comissao) | Ja implementado |
| Funil de propostas | Ja implementado |
| Mapa de propostas com marcadores coloridos | Ja implementado |
| Aging de inadimplencia | Ja implementado |
| Tabela proximos vencimentos | Ja implementado |
| Fluxo de caixa | Ja implementado |

---

## O que e VIAVEL implementar (melhorias incrementais)

### 1. Nova aba "Obras" no Dashboard

Adicionar uma terceira aba ao dashboard existente com KPIs e tabela de obras:

**KPIs de Obras:**
- Obras em andamento (count de projects com status "em_andamento")
- Obras criticas / com atraso (projetos cuja end_date ja passou e status != concluida)
- Margem de lucro media (calculada a partir de project_costs e project_revenues)
- Custo total realizado no periodo (soma de project_costs.actual_value)

**Tabela de Obras Criticas:**
- Lista de obras com atraso ou status critico
- Link direto para `/obras/:id/relatorio`

**Dados necessarios:** Tabelas `projects`, `project_costs`, `project_revenues` -- todas ja existem no banco.

### 2. Filtros adicionais no Dashboard

Adicionar ao componente DashboardFilters:
- **Gestor de Obra**: Select com project_managers distintos da tabela projects
- **Status da Obra**: Select com status distintos

Esses filtros afetariam apenas a aba "Obras".

### 3. Grafico Receitas vs Custos por Mes

Grafico de barras agrupadas usando Recharts (ja instalado), comparando totais mensais de `project_costs.actual_value` vs `project_revenues.actual_value` nos ultimos 12 meses.

### 4. Grafico Margem de Lucro por Obra

Grafico de barras horizontais mostrando a margem de cada obra (receita real - custo real) / receita real.

---

## O que NAO e viavel ou NAO faz sentido

| Item solicitado | Motivo |
|---|---|
| Layout de grade configuravel (drag & drop) | Complexidade muito alta, requer biblioteca como react-grid-layout, nao agrega valor proporcional |
| Filtro por Cliente com autocomplete | Pode ser implementado mas nao afeta significativamente a experiencia no dashboard |
| Curva S agregada de todas as obras | Requer dados de peso percentual das etapas (stage_weight) que dependem de cada obra ter etapas cadastradas -- dado potencialmente incompleto |
| Mapa de Obras (por localizacao) | A tabela projects NAO tem campos de endereco/coordenadas, apenas client_id. Seria necessario migrar dados |
| Feed de atividades/alertas | Requer infraestrutura de notificacoes (tabela de eventos, triggers) que nao existe |
| Busca global universal | Requer componente complexo com busca em multiplas tabelas simultaneamente, melhor como tarefa separada |
| Navegacao lateral fixa | O sistema ja usa navegacao superior fixa por decisao de design -- mudar seria uma regressao |
| Padronizacao de design system | Ja existe consistencia visual; esta e uma tarefa continua, nao pontual |

---

## Plano de Implementacao Recomendado

### Arquivos a criar:
1. `src/components/dashboard/ProjectsKPIs.tsx` -- KPIs da aba Obras
2. `src/components/dashboard/CriticalProjectsTable.tsx` -- Tabela de obras criticas
3. `src/components/dashboard/RevenueCostChart.tsx` -- Grafico receitas vs custos mensal
4. `src/components/dashboard/ProfitMarginChart.tsx` -- Margem por obra

### Arquivos a modificar:
1. `src/pages/Index.tsx` -- Adicionar terceira aba "Obras"
2. `src/hooks/use-dashboard-metrics.ts` -- Adicionar queries para projects, project_costs, project_revenues e calculos de KPIs de obras
3. `src/components/dashboard/DashboardFilters.tsx` -- Adicionar filtros de gestor e status (opcionais, condicionais a aba ativa)

### Sequencia:
1. Expandir o hook `use-dashboard-metrics` com queries de obras/custos/receitas
2. Criar os 4 novos componentes de dashboard
3. Integrar a nova aba "Obras" no Index.tsx
4. Adicionar filtros contextuais

---

## Resumo

Das ~15 funcionalidades solicitadas na Etapa 3, cerca de 8 ja estao implementadas. Recomendo focar na **nova aba "Obras"** com 4 novos widgets (KPIs, tabela critica, receita vs custo, margem por obra) e filtros adicionais. Isso transforma o dashboard existente em uma verdadeira "Torre de Controle" sem reescrever o que ja funciona.

