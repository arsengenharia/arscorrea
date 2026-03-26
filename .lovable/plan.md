

# Gerar Documentacao MD Completa do Sistema ARS Engenharia

## Objetivo
Criar um documento Markdown extremamente detalhado em `/mnt/documents/sistema-ars-documentacao-completa.md` cobrindo todas as paginas, campos de formularios, calculos, indicadores e relatorios do sistema.

## Estrutura do Documento

### 1. Visao Geral do Sistema
- Stack: React + Vite + TypeScript + Tailwind CSS + Supabase
- Autenticacao: Admin (role `admin`) e Cliente (role `client`)
- Rotas protegidas com `ProtectedRoute` e `ClientRoute`

### 2. Autenticacao (`/auth`, `/portal`)
- Login administrativo e portal do cliente
- Reset de senha via `/portal/redefinir-senha`

### 3. Dashboard (`/`) — 3 abas
**Aba Comercial:**
- KPIs: total propostas, valor total, taxa de conversao, taxa de perda
- Funil de propostas por estagio
- Grafico aging de propostas
- Mapa de propostas (geocodificacao)
- Tabela de propostas mais antigas

**Aba Financeiro:**
- KPIs: receita prevista/recebida, inadimplencia, comissoes
- Grafico fluxo de caixa (12 meses)
- Grafico aging de inadimplencia
- Tabela proximos vencimentos

**Aba Obras:**
- KPIs: total obras, em andamento, atrasadas, margem media
- Grafico receita vs custo por mes
- Grafico margem de lucro por obra
- Tabela obras criticas
- Filtros por gestor e status

### 4. Clientes (`/clientes`)
**Campos do formulario:**
- Nome (obrigatorio), CPF/CNPJ, Responsavel, Telefone, Email
- Tipo: Pessoa Fisica / Juridica / Condominio
- Segmento: Residencial / Comercial / Industrial
- Responsavel pelo atendimento: Ana Andrade / Ana Correa / Andre Amaral / Outro
- Canal do Lead: Google / Instagram / Indicacao / Sindico / Organico
- Data do Lead, Indicacao (referral)
- Endereco: CEP (com busca automatica via ViaCEP), Rua, Numero, Complemento, Bairro, Cidade, Estado
- Observacoes
- Arquivos anexos (upload para storage `clients`)

**Detalhes do cliente (`/clientes/:id`):**
- Dados cadastrais, propostas vinculadas, contratos, obras

### 5. Propostas (`/propostas`)
**Campos do formulario:**
- Cliente (obrigatorio), Titulo, Nome do Condominio
- Endereco da obra, Cidade, Estado
- Escopo do servico (texto livre com template padrao de 7 secoes)
- Itens da proposta: Categoria, Descricao, Unidade, Quantidade, Preco Unitario, Total, Observacoes
- Totais: Subtotal (soma dos itens), Desconto (fixo R$ ou percentual %), Total
- Validade (dias, padrao 10), Prazo execucao (dias, padrao 60)
- Condicoes de pagamento, Garantia, Exclusoes, Observacoes
- Status: draft / sent / won / lost
- Motivo da perda (loss_reason), Data prevista de fechamento
- Vinculo com Obra (project_id)
- Importacao de PDF com IA (edge function `parse-proposal-pdf`)
- Geracao de PDF com @react-pdf/renderer
- Numeracao automatica via sequencia no banco

**Calculos:**
- `subtotal = soma(item.quantity * item.unitPrice)`
- `desconto = tipo "percent" ? subtotal * (valor/100) : valor`
- `total = max(0, subtotal - desconto)`

### 6. Contratos (`/contratos`)
**Campos do formulario:**
- Proposta vinculada (obrigatoria, preenche dados automaticamente)
- Cliente (preenchido via proposta)
- Titulo, Escopo do servico
- Itens: mesma estrutura da proposta (Categoria, Descricao, Unidade, Qtd, Preco Unit., Total)
- Totais: Subtotal, Desconto (fixo/percentual), Total
- Status: ativo / em_assinatura / encerrado / cancelado
- Obra vinculada (project_id)
- Data de vencimento, Valor de aditivo
- Condicoes de pagamento (texto)

**Lancamentos financeiros (contract_payments):**
- Tipo (kind): entrada / parcela / comissao
- Descricao, Valor previsto, Data prevista
- Valor recebido, Data recebimento
- Status: pendente / pago / atrasado
- Ordem, Observacoes
- Geracao assistida de parcelas (GeneratePaymentsDialog)

**Financeiro do contrato (`/contratos/:id/financeiro`):**
- Cards: Total do Contrato, Total Previsto, Total Recebido, Comissao
- Resumo com alertas de divergencia
- Lista de lancamentos editaveis

**Calculos:**
- `subtotal = soma(item.quantity * item.unit_price)`
- `desconto = tipo "percent" ? (subtotal * valor/100) : valor`
- `total = subtotal - desconto`
- `comissao_prevista = soma(linhas kind="comissao".expected_value)`
- `comissao_recebida = soma(linhas kind="comissao".received_value)`

### 7. Obras (`/obras`)
**Campos do formulario:**
- Nome (obrigatorio), Cliente (obrigatorio)
- Status: Pendente / Em Andamento / Concluido / Atrasado
- Data inicio, Data conclusao prevista
- Gestor da obra

**Detalhes da obra (`/obras/:projectId`):**
- Cards de informacao (obra e cliente)
- Diario de obra (lista de etapas)
- Ocorrencias do portal
- Documentos compartilhados

**Etapas (stages):**
- Nome, Status (pendente/iniciado/concluido)
- Peso da etapa (0.00 a 1.00, ex: 0.10 = 10%)
- Data inicio e fim do relatorio
- Relatorio (texto descritivo)
- Fotos (upload multiplo, max 5MB cada, armazenadas no bucket `stages`)

**Custos (`/obras/:projectId/custos`):**
- Tipo: Direto / Indireto
- Fornecedor (vinculo com tabela suppliers)
- Descricao, Valor Previsto, Valor Realizado, Data

**Receitas (`/obras/:projectId/receitas`):**
- Tipo: Contrato / Aditivo / Outro
- Descricao, Valor Previsto, Valor Realizado, Data

### 8. Relatorio Gerencial (`/obras/:projectId/relatorio`)
Edge function `project-management-report` que calcula:

**Analise Fisica — IFEC (Indice Fisico de Eficiencia Construtiva):**
- `IFEC = peso_acumulado_concluido / peso_total_etapas`
- IFEC >= 1.0: eficiente (verde)
- IFEC < 1.0: atencao (amarelo/vermelho)
- Status: "acima do previsto" / "abaixo do previsto" / "conforme previsto" / "obra finalizada" / "sem etapas cadastradas"

**Producao mensal e acumulada:**
- Agrupamento por mes/ano baseado em `report_end_date`
- Previsto: soma dos pesos das etapas no mes (x100 para %)
- Real: soma dos pesos das etapas concluidas no mes (x100 para %)
- Variacao: real - previsto
- Acumulada: soma progressiva mes a mes

**Analise Financeira — IEC (Indice de Eficiencia de Custos):**
- `IEC Total = custo_total_real / custo_total_previsto`
- `IEC Direto = custo_direto_real / custo_direto_previsto`
- `IEC Indireto = custo_indireto_real / custo_indireto_previsto`
- IEC < 1.000: abaixo do orcamento (verde)
- IEC = 1.000: conforme previsto (amarelo)
- IEC > 1.000: estouro orcamentario (vermelho)

**Detalhamento financeiro:**
- Custo direto previsto/real, Custo indireto previsto/real
- Custo total previsto/real, Variacao de custo
- Receita total prevista/realizada, Variacao de receita
- `Saldo = receita_real - custo_total_real`
- `Margem = (saldo / receita_real) * 100`
- `Prazo (dias) = (data_fim - data_inicio) em dias`

**Graficos:**
- Curva S (producao acumulada previsto vs realizado)
- Producao mensal (barras)

**Exportacao PDF:** Via ReportPDFButton com @react-pdf/renderer

### 9. Agenda (`/agenda`)
- 4 visualizacoes: Dia, Semana, Mes, Agenda
- Mini calendario lateral
- Campos do evento: Titulo, Descricao, Local, Data/Hora inicio e fim, Dia inteiro
- Participantes (attendees) com status: invited / confirmed / declined
- Fuso horario: America/Sao_Paulo (padrao)

### 10. Fornecedores (`/fornecedores`)
**Campos:**
- Nome fantasia (obrigatorio), Razao social
- CNPJ/CPF, Contato, Telefone, Email
- Endereco

### 11. Portal do Cliente
**Login (`/portal`):** Email e senha

**Lista de obras (`/portal/obras`):** Obras vinculadas via `client_portal_access`

**Detalhes da obra (`/portal/obra/:projectId`) — 4 abas:**
- **Acompanhamento:** Progresso geral, lista de etapas com fotos (lightbox)
- **Comunicacoes:** Criar ocorrencias (tipo: duvida/reclamacao/solicitacao/elogio), acompanhar status (aberto/em_analise/respondido/resolvido), anexar fotos, excluir proprias ocorrencias
- **Documentos:** Visualizar documentos compartilhados pelo admin
- **Informacoes:** Dados da obra e cliente

**Gestao de acesso (admin):** Dialog `ManagePortalAccessDialog` para criar usuario portal via edge function `create-portal-user`

### 12. Perfil e Notificacoes
- **Perfil (`/perfil`):** Nome de exibicao, avatar
- **Notificacoes (`/notificacoes`):** Lista de notificacoes com marcar como lida

### 13. Banco de Dados — 18 Tabelas
`clients`, `projects`, `stages`, `stage_photos`, `proposals`, `proposal_items`, `proposal_stages`, `proposal_imports`, `contracts`, `contract_items`, `contract_payments`, `contract_financial`, `project_costs`, `project_revenues`, `project_reports`, `project_documents`, `calendar_events`, `calendar_event_attendees`, `portal_events`, `portal_event_photos`, `suppliers`, `notifications`, `profiles`, `user_roles`, `client_portal_access`, `client_files`

**RLS:** Todas as tabelas possuem Row Level Security. Admins acessam tudo; clientes acessam apenas dados vinculados via `client_portal_access`.

### 14. Edge Functions
- `project-management-report`: Calcula IFEC, IEC e gera dados do relatorio gerencial
- `parse-proposal-pdf`: Importa propostas via PDF com IA (OpenAI)
- `create-portal-user`: Cria usuario do portal do cliente no Supabase Auth

## Implementacao
- Gerar o arquivo MD via script salvo em `/mnt/documents/`
- Documento unico, completo e auto-contido

