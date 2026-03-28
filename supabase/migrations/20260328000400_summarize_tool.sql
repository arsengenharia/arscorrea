INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, required_roles, requires_confirmation)
VALUES (
  'summarize_document',
  'Resumir Documento',
  'Lê um documento (PDF, XML, texto) do storage e gera um resumo estruturado com IA. Use quando o usuário pedir para resumir, analisar ou explicar um documento.',
  'analysis',
  'edge_function',
  'summarize-document',
  '{"type":"object","properties":{"bucket":{"type":"string","description":"Nome do bucket (nfe-attachments, lancamentos, contracts, etc.)"},"path":{"type":"string","description":"Caminho do arquivo no storage"},"context":{"type":"string","description":"Contexto adicional para a análise"}},"required":["bucket","path"]}',
  '{admin,financeiro}',
  false
)
ON CONFLICT (name) DO NOTHING;
