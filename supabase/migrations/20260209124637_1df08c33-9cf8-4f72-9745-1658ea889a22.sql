-- Inserir 8 novas etapas
INSERT INTO proposal_stages (name, order_index, is_active) VALUES
  ('Proposta em aberto (inicial)', 10, true),
  ('Visita agendada', 20, true),
  ('Visita realizada', 30, true),
  ('Proposta enviada', 40, true),
  ('Reunião marcada para entrega', 50, true),
  ('Proposta em aberto', 60, true),
  ('Proposta recusada', 70, true),
  ('Proposta aprovada', 80, true);

-- Migrar propostas existentes: "Em aberto" -> "Proposta em aberto (inicial)"
UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta em aberto (inicial)' LIMIT 1
) WHERE stage_id = '0177211f-0a9d-4285-b0ad-c2f378ed0d5a';

-- "Em análise" -> "Reunião marcada para entrega"
UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Reunião marcada para entrega' LIMIT 1
) WHERE stage_id = '4d2ed8b0-7ea2-4d61-97aa-8dc9f054a033';

-- "Perdida" -> "Proposta recusada"
UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta recusada' LIMIT 1
) WHERE stage_id = '58872aa6-7908-43e8-b8b3-0ed3fa22d72f';

-- "Fechada" -> "Proposta aprovada"
UPDATE proposals SET stage_id = (
  SELECT id FROM proposal_stages WHERE name = 'Proposta aprovada' LIMIT 1
) WHERE stage_id = 'd250f3f7-2f74-4956-a8dd-7f725f63669e';

-- Desativar etapas antigas
UPDATE proposal_stages SET is_active = false
WHERE id IN (
  '0177211f-0a9d-4285-b0ad-c2f378ed0d5a',
  'd250f3f7-2f74-4956-a8dd-7f725f63669e',
  '4d2ed8b0-7ea2-4d61-97aa-8dc9f054a033',
  '58872aa6-7908-43e8-b8b3-0ed3fa22d72f'
);