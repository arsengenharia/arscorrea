

# Melhorias no Portal do Cliente - Dashboard e Lista de Obras

## Analise do Prompt vs Estado Atual

A maior parte do que o prompt solicita ja esta implementado e funcionando:

| Item do Prompt | Status |
|---|---|
| Login com email/senha | Ja implementado |
| Mostrar/esconder senha | Ja implementado |
| "Esqueci minha senha" | Ja implementado (etapa anterior) |
| Gestao de estado de autenticacao (Context API) | Ja implementado (AuthProvider) |
| Header com logo, nome do usuario, botao "Sair" | Ja implementado (PortalLayout) |
| Cards de obras com nome, status e badge colorido | Ja implementado |
| Pagina de detalhes com progresso, etapas e fotos | Ja implementado |
| Responsividade | Ja implementado |
| Estados de carregamento | Ja implementado |
| Tratamento de erros | Ja implementado |

## Melhorias a Implementar

### 1. Cards de obras enriquecidos na lista (`PortalProjectsList.tsx`)
Os cards atuais mostram apenas nome, cliente e status. Adicionar:
- **Barra de progresso** calculada a partir das etapas (peso concluido / peso total)
- **Datas** de inicio e previsao de conclusao
- Buscar dados de `stages` junto com os projetos para calcular o progresso

### 2. Mensagem de boas-vindas personalizada (`PortalProjectsList.tsx`)
- Saudacao com o nome do cliente (ou email) e mensagem contextual
- Exemplo: "Ola, Joao! Acompanhe suas obras abaixo."

### 3. Painel de atividades recentes (`PortalProjectsList.tsx`)
- Pequena secao acima dos cards mostrando as ultimas atualizacoes:
  - Respostas recentes a comunicacoes (`portal_events` com `admin_response` preenchido)
  - Contagem de comunicacoes pendentes (status "Aberto" ou "Em Analise")
- Consulta simples a tabela `portal_events` filtrada pelos projetos do usuario

### 4. Navegacao no header (`PortalLayout.tsx`)
- Adicionar link "Minhas Obras" no header para facilitar a navegacao quando o cliente esta na pagina de detalhes de uma obra

## Detalhes Tecnicos

### `PortalProjectsList.tsx`
- Alterar a query para incluir `stages(status, stage_weight)` no select
- Calcular progresso por projeto: `soma(peso das etapas concluidas) / soma(peso total) * 100`
- Adicionar query separada para `portal_events` recentes (ultimos 7 dias) dos projetos do usuario
- Renderizar barra `Progress` e datas formatadas dentro de cada card
- Adicionar secao de boas-vindas no topo com nome do usuario

### `PortalLayout.tsx`
- Adicionar link "Minhas Obras" (`/portal/obras`) ao lado do texto "Portal do Cliente" no header

### Nenhuma mudanca necessaria em:
- `PortalLogin.tsx` (ja completo)
- `PortalProject.tsx` (ja completo)
- `AuthProvider.tsx` (ja completo)
- `ClientRoute.tsx` (ja completo)
- Edge functions (ja completas)
