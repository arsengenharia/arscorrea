INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, required_roles, requires_confirmation)
VALUES (
  'navigate_to_page',
  'Navegar para Página',
  'Navega o usuário para uma página específica do sistema. Use quando o usuário pedir para abrir uma obra, contrato, fornecedor, ou qualquer módulo.',
  'action',
  'composite',
  'navigate',
  '{"type":"object","properties":{"path":{"type":"string","description":"Caminho da página. Ex: /obras/uuid/financeiro, /fornecedores/uuid, /financeiro/lancamentos, /financeiro/recebiveis, /financeiro/anomalias"},"description":{"type":"string","description":"Descrição curta do que vai ser mostrado"}},"required":["path"]}',
  '{admin,financeiro,client}',
  false
)
ON CONFLICT (name) DO NOTHING;
