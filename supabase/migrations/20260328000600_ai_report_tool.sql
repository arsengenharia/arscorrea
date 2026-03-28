-- Sprint 4: AI report generation tool (generate_report)
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, required_roles, ativo, requires_confirmation, risk_level)
VALUES
('generate_report', 'Gerar Relatório Financeiro', 'Gera um relatório financeiro em PDF para um projeto específico. Use quando o usuário pedir relatório, resumo financeiro, ou extrato de uma obra.', 'action', 'composite', 'generate_report',
'{"type":"object","properties":{"project_id":{"type":"string","description":"ID do projeto"},"report_type":{"type":"string","enum":["financeiro","completo","recebiveis"],"description":"Tipo de relatório"}},"required":["project_id"]}',
'{admin,financeiro}', true, false, 'low');
