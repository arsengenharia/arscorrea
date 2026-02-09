
# Plano: Padronizar Status/Etapas de Propostas

## Resumo
Substituir as 4 etapas atuais do funil de propostas (Em aberto, Fechada, Em analise, Perdida) por 8 novos estados, atualizando banco de dados, componentes visuais, dashboards e logica de negocios.

## Etapas Atuais vs Novas

| Atual | Nova |
|-------|------|
| Em aberto | Proposta em aberto (inicial) |
| - | Visita agendada |
| - | Visita realizada |
| - | Proposta enviada |
| Em analise | Reuniao marcada para entrega |
| - | Proposta em aberto |
| Perdida | Proposta recusada |
| Fechada | Proposta aprovada |

## Migracao de Dados (Supabase)

Executar migration SQL para:
1. Desativar etapas antigas (`is_active = false`)
2. Inserir 8 novas etapas com `order_index` sequencial
3. Atualizar `stage_id` de propostas existentes para mapear para as novas etapas:
   - "Em aberto" -> "Proposta em aberto (inicial)"
   - "Em analise" -> "Reuniao marcada para entrega"
   - "Perdida" -> "Proposta recusada"
   - "Fechada" -> "Proposta aprovada"

## Arquivos a Modificar

### 1. `src/components/proposals/ProposalStageBadge.tsx`
Atualizar o mapa `stageColors` com cores para os 8 novos estados:
- Proposta em aberto (inicial) - azul
- Visita agendada - indigo
- Visita realizada - purple
- Proposta enviada - cyan
- Reuniao marcada para entrega - amber
- Proposta em aberto - blue
- Proposta recusada - red
- Proposta aprovada - green

### 2. `src/hooks/use-dashboard-metrics.ts`
Atualizar toda a logica de filtragem que referencia nomes de etapas:
- **Propostas "fechadas"**: substituir `"fechada"` por `"proposta aprovada"`
- **Propostas "perdidas"**: substituir `"perdida"` por `"proposta recusada"`
- **Propostas em aberto**: todas que nao sao "proposta aprovada" nem "proposta recusada"
- Taxa de conversao, ticket medio, loss rate: mesma logica com novos nomes

### 3. `src/components/dashboard/ProposalsMap.tsx`
Atualizar o array `STAGES` com os 8 novos estados e suas cores, e o mapa `STAGE_COLORS`.

### 4. `src/components/dashboard/ProposalsFunnel.tsx`
Atualizar o mapa `COLORS` com os 8 novos nomes de etapas e cores correspondentes.

### 5. `src/components/dashboard/ProposalsAgingChart.tsx`
Atualizar o mapa `COLORS` com os 8 novos nomes de etapas.

### 6. `src/components/proposals/ProposalStageSelect.tsx`
Nenhuma alteracao necessaria - ja carrega etapas dinamicamente do banco via query.

### 7. `src/components/proposals/ProposalsList.tsx`
Nenhuma alteracao necessaria - usa dados do banco de forma dinamica.

## Detalhes Tecnicos

### Migration SQL
```sql
-- Inserir novas etapas
INSERT INTO proposal_stages (name, order_index, is_active) VALUES
  ('Proposta em aberto (inicial)', 10, true),
  ('Visita agendada', 20, true),
  ('Visita realizada', 30, true),
  ('Proposta enviada', 40, true),
  ('Reunião marcada para entrega', 50, true),
  ('Proposta em aberto', 60, true),
  ('Proposta recusada', 70, true),
  ('Proposta aprovada', 80, true);

-- Migrar propostas existentes
UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta em aberto (inicial)'
) WHERE stage_id = '0177211f-0a9d-4285-b0ad-c2f378ed0d5a';

UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Reunião marcada para entrega'
) WHERE stage_id = '4d2ed8b0-7ea2-4d61-97aa-8dc9f054a033';

UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta recusada'
) WHERE stage_id = '58872aa6-7908-43e8-b8b3-0ed3fa22d72f';

UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta aprovada'
) WHERE stage_id = 'd250f3f7-2f74-4956-a8dd-7f725f63669e';

-- Desativar etapas antigas
UPDATE proposal_stages SET is_active = false
WHERE id IN (
  '0177211f-0a9d-4285-b0ad-c2f378ed0d5a',
  'd250f3f7-2f74-4956-a8dd-7f725f63669e',
  '4d2ed8b0-7ea2-4d61-97aa-8dc9f054a033',
  '58872aa6-7908-43e8-b8b3-0ed3fa22d72f'
);
```

### Mapa de cores para os novos estados
```typescript
const stageColors = {
  "Proposta em aberto (inicial)": "bg-blue-100 text-blue-700",
  "Visita agendada": "bg-indigo-100 text-indigo-700",
  "Visita realizada": "bg-purple-100 text-purple-700",
  "Proposta enviada": "bg-cyan-100 text-cyan-700",
  "Reunião marcada para entrega": "bg-amber-100 text-amber-700",
  "Proposta em aberto": "bg-sky-100 text-sky-700",
  "Proposta recusada": "bg-red-100 text-red-700",
  "Proposta aprovada": "bg-green-100 text-green-700",
};
```

### Logica de negocios no dashboard
A regra principal e:
- **Aprovada** = `"proposta aprovada"` (equivale a antiga "Fechada")
- **Recusada** = `"proposta recusada"` (equivale a antiga "Perdida")
- **Em aberto** = qualquer outra etapa (6 estados intermediarios)

## Resumo de Impacto
- 1 migration SQL (dados + schema)
- 4 arquivos de componentes atualizados (badges, charts, map)
- 1 hook de metricas atualizado (logica de negocios)
- 0 alteracoes em ProposalStageSelect (ja e dinamico)
