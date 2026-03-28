-- AI Smart Filter tools: filter_entries and filter_recebiveis
-- These are composite tools that return frontend actions (no DB mutation)

INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, required_roles, ativo, requires_confirmation, risk_level)
VALUES
('filter_entries', 'Filtrar Lançamentos', 'Aplica filtros na tela de lançamentos financeiros. Use quando o usuário pedir para ver lançamentos de um projeto específico, categoria, ou período.', 'action', 'composite', 'filter_entries',
'{"type":"object","properties":{"project_id":{"type":"string","description":"ID do projeto para filtrar"},"category_id":{"type":"string","description":"ID da categoria para filtrar"},"category":{"type":"string","description":"Nome da categoria para filtrar (ex: Material, Mão de Obra)"},"date_from":{"type":"string","description":"Data início (YYYY-MM-DD)"},"date_to":{"type":"string","description":"Data fim (YYYY-MM-DD)"}}}',
'{admin,financeiro}', true, false, 'low'),

('filter_recebiveis', 'Filtrar Recebíveis', 'Aplica filtros na tela de recebíveis/contas a receber. Use quando o usuário pedir para ver recebíveis de um projeto ou status específico.', 'action', 'composite', 'filter_recebiveis',
'{"type":"object","properties":{"project_id":{"type":"string","description":"ID do projeto para filtrar"},"status":{"type":"string","description":"Status do recebível (pendente, recebido, vencido, parcial)"}}}',
'{admin,financeiro}', true, false, 'low');
