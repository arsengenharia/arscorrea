

# Plano: Visao 360 do Cliente + Filtros Aprimorados na Lista

## Resumo

Criar uma pagina dedicada `/clientes/:id` com visao completa do cliente (dados, propostas, contratos, obras, resumo financeiro) e adicionar filtros por tipo de cliente e segmento na lista de clientes.

---

## 1. Pagina Visao 360 do Cliente (`/clientes/:id`)

### Nova pagina: `src/pages/ClientDetails.tsx`

Pagina com layout em abas usando o componente Tabs existente:

**Aba "Dados Cadastrais"**
- Dados pessoais: nome, codigo, documento, tipo_cliente, segmento, responsavel, telefone, email
- Endereco completo
- Dados CRM: canal de origem, representante, data do lead, observacoes
- Botoes de acao: Editar, WhatsApp, Ver no Maps, Arquivos

**Aba "Propostas"**
- Tabela com propostas vinculadas ao client_id
- Colunas: numero, titulo, valor total, status, data prevista de fechamento, motivo de perda
- Link para abrir a proposta (`/propostas/:id`)
- Query: `supabase.from("proposals").select("*").eq("client_id", clientId)`

**Aba "Contratos"**
- Tabela com contratos vinculados via proposals do cliente
- Colunas: numero do contrato, titulo, valor total, status, data de vencimento
- Link para abrir o contrato (`/contratos/:id`)
- Query: `supabase.from("contracts").select("*, proposals!inner(client_id)").eq("proposals.client_id", clientId)`

**Aba "Obras"**
- Tabela com projetos vinculados ao client_id
- Colunas: nome, status, data inicio, data fim, gerente
- Link para detalhes da obra (`/obras/:id`)
- Query: `supabase.from("projects").select("*").eq("client_id", clientId)`

**Aba "Financeiro"**
- Resumo financeiro consolidado:
  - Total de contratos (soma de `contracts.total`)
  - Total de pagamentos recebidos (soma de `contract_payments` com status "pago")
  - Saldo devedor (total contratos - pagamentos recebidos)
  - Quantidade de propostas por status (ganhas, perdidas, em andamento)

### Rota

Adicionar em `App.tsx`:
```
/clientes/:clientId -> ClientDetails
```

### Navegacao

- Na `ClientsList.tsx`, o botao "Eye" (visualizar) passa a navegar para `/clientes/:id` em vez de abrir o `ViewClientDialog`
- Manter o `ViewClientDialog` como componente (pode ser removido depois), mas a navegacao principal vai para a nova pagina

---

## 2. Filtros Aprimorados na Lista de Clientes

### Arquivo: `src/components/clients/ClientsList.tsx`

Substituir o componente `ProjectsSearch` (generico, feito para obras) por filtros proprios:

- **Busca por texto**: campo de busca existente (nome, codigo, documento)
- **Filtro por Tipo de Cliente**: Select com opcoes "Todos", "Pessoa Fisica", "Pessoa Juridica", "Condominio"
- **Filtro por Segmento**: Select com opcoes "Todos", "Residencial", "Comercial", "Industrial"

Atualizar a logica de `filteredClients` para aplicar os tres filtros combinados.

---

## Arquivos Criados

1. `src/pages/ClientDetails.tsx` -- pagina Visao 360

## Arquivos Modificados

1. `src/App.tsx` -- adicionar rota `/clientes/:clientId`
2. `src/components/clients/ClientsList.tsx` -- navegacao para `/clientes/:id` + filtros proprios por tipo e segmento

## Sequencia de Implementacao

1. Criar pagina `ClientDetails.tsx` com as 5 abas
2. Registrar rota no `App.tsx`
3. Atualizar `ClientsList.tsx`: trocar navegacao do botao Eye + adicionar filtros

