

# Etapa 4 - Analise de Viabilidade: Detalhes da Obra e Comunicacao

## Estado Atual vs Requisitos

| Requisito | Status | Observacao |
|---|---|---|
| Cabecalho com nome da obra + botao Voltar | Implementado | PortalProject.tsx + PortalLayout.tsx |
| Informacoes gerais (nome, datas, gestor) | Implementado | Cards de progresso, datas, responsavel, cliente |
| Progresso geral com barra visual | Implementado | Card com percentual + Progress bar |
| Etapas com status e cores | Implementado | PortalStagesList com badges coloridos |
| Fotos das etapas | Implementado | StagePhoto com signed URLs |
| Formulario de comunicacao (titulo, descricao, tipo, fotos) | Implementado | PortalEventForm com Sheet + upload ate 5 fotos |
| Historico de comunicacoes com status e badges | Implementado | PortalEventsList com cards, badges, resposta ARS |
| Responsividade | Implementado | Grid responsivo em todas as secoes |
| Estados de carregamento | Implementado | Skeleton/pulse nos componentes |

## O que DESCARTAMOS (nao viavel ou desnecessario)

### 1. Resumo Financeiro no Portal
**Descartado.** A tabela `projects` nao tem campos financeiros. Os dados financeiros estao em `contracts` e `contract_payments`, vinculados via `project_id`. Embora tecnicamente possivel buscar esses dados, **expor valores financeiros no portal do cliente levanta preocupacoes de seguranca** -- as politicas RLS atuais restringem acesso por `client_portal_access`, mas nao ha politicas RLS especificas para `contracts` ou `contract_payments` que filtrem por usuario do portal. Seria necessario criar novas politicas e validar cuidadosamente quais dados sao expostos. Recomendo tratar isso como uma etapa separada e dedicada, com analise de seguranca propria.

### 2. Diario de Obra (Feed de Eventos)
**Descartado.** Nao existe tabela `obras_diario` no banco de dados. As etapas (`stages`) ja possuem campo `report` e fotos, que e o que esta sendo exibido. Criar um diario de obra completo exigiria uma nova tabela e logica de alimentacao de dados que esta fora do escopo atual.

### 3. Gantt / Linha do Tempo Visual
**Descartado.** Exigiria uma biblioteca adicional (como vis-timeline ou similar) e as etapas atuais nao possuem datas de inicio/fim individuais consistentes (`report_start_date` e `report_end_date` sao opcionais e de relatorio). O custo-beneficio nao justifica para o portal read-only.

### 4. Endereco da obra
**Descartado.** A tabela `projects` nao possui campo de endereco. O endereco existe apenas em `proposals` (`work_address`).

## Melhorias a Implementar

Considerando o que ja existe, ha 3 melhorias concretas e de alto impacto:

### 1. Lightbox para fotos (etapas e comunicacoes)
Atualmente as fotos sao exibidas em miniatura mas **nao sao clicaveis para expandir**. Implementar um lightbox simples com Dialog para visualizacao em tela cheia.

**Arquivos afetados:**
- `src/components/portal/PortalStagesList.tsx` -- tornar fotos clicaveis
- `src/components/portal/PortalEventsList.tsx` -- tornar fotos clicaveis
- Criar componente `src/components/portal/PhotoLightbox.tsx` -- Dialog com imagem ampliada e navegacao entre fotos

### 2. Organizar pagina com abas (Tabs)
A pagina atual mostra tudo em scroll vertical. Reorganizar em abas para melhor navegacao:
- **Aba "Visao Geral"**: Cards de progresso, datas, responsavel, cliente (conteudo atual do topo)
- **Aba "Etapas"**: Lista de etapas com fotos (PortalStagesList)
- **Aba "Comunicacoes"**: Formulario + historico (PortalEventForm + PortalEventsList)

**Arquivo afetado:**
- `src/pages/portal/PortalProject.tsx` -- reestruturar com componente Tabs

### 3. Endereco da obra (via proposta vinculada)
Buscar o `work_address` da proposta vinculada ao contrato do projeto e exibir na secao de informacoes gerais. Requer um join adicional: `contracts(proposal:proposals(work_address))`.

**Arquivo afetado:**
- `src/pages/portal/PortalProject.tsx` -- expandir query e exibir endereco

## Detalhes Tecnicos

### PhotoLightbox (novo componente)
- Componente reutilizavel usando `Dialog` do Radix
- Props: `photos: string[]` (paths), `bucket: string`, `initialIndex: number`
- Navegacao com setas ou swipe
- Usa `useSignedUrl` ou `getSignedUrl` para carregar a imagem ampliada

### PortalProject.tsx (Tabs)
- Importar `Tabs, TabsList, TabsTrigger, TabsContent` do UI
- 3 abas: "Visao Geral", "Etapas", "Comunicacoes"
- Manter badge de contagem de comunicacoes pendentes na aba
- Query expandida para incluir endereco via contrato/proposta

### RLS
- Nenhuma alteracao de RLS necessaria -- todos os dados ja sao acessiveis via politicas existentes de `client_portal_access`
- As tabelas `contracts` e `proposals` so seriam consultadas para o campo `work_address`, sem expor dados financeiros

