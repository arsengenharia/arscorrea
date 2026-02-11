
# Analise de Viabilidade: Etapa 2 - Backend de Dados e Comunicacao

## Veredicto: Parcialmente Viavel, mas com Problemas Significativos

A proposta da Etapa 2 repete os mesmos erros conceituais da Etapa 1 original: propoe criar uma camada de backend REST customizada que e **redundante** com o que o Supabase ja oferece nativamente. Alem disso, varias funcionalidades propostas **ja existem** no sistema atual.

---

## O que esta ERRADO ou DESNECESSARIO na proposta

| Item proposto | Problema |
|---|---|
| APIs REST customizadas (GET /portal/obras, etc.) | Desnecessario. O Supabase client + RLS ja faz isso. As queries ja existem no `PortalProject.tsx` e `PortalProjectsList.tsx` |
| FK para `portal_clientes_usuarios.id` | Essa tabela nao existe e nunca foi criada. Usamos `auth.users` via Supabase Auth |
| `fotos_base64` no POST | Violacao grave. Nunca enviar base64 pela API. Usar Supabase Storage com upload direto |
| Swagger/OpenAPI | Nao aplicavel. Nao temos APIs REST separadas, usamos Supabase client direto |
| Resumo financeiro no portal | Dados sensiveis (valores de contrato, receitas). Precisa de decisao de negocio se o cliente deve ver isso |
| Diario de obra | Nao existe tabela `obras_diario` no sistema. Seria uma funcionalidade completamente nova |
| Documentos compartilhados | Nao existe mecanismo para marcar documentos como "compartilhados com cliente" |
| `ON UPDATE CURRENT_TIMESTAMP` | Sintaxe MySQL, nao funciona no PostgreSQL. Usamos triggers `update_updated_at_column()` |

---

## O que JA EXISTE e funciona

- Lista de obras do cliente: `PortalProjectsList.tsx` (ja filtra por role)
- Detalhes da obra com progresso: `PortalProject.tsx` (ja calcula % por peso)
- Etapas com status e fotos: `PortalStagesList.tsx` (ja exibe galeria)
- Upload de fotos de etapa: bucket `stages` no Supabase Storage
- Controle de acesso: `client_portal_access` + RLS em `projects`, `stages`, `stage_photos`

---

## O que VALE implementar da Etapa 2

Das funcionalidades propostas, apenas uma e genuinamente nova e util:

### Comunicacao Cliente-ARS (Eventos/Ocorrencias do Portal)

Permitir que o cliente envie duvidas, problemas ou solicitacoes com fotos anexadas, e que a equipe ARS possa responder.

### Abordagem Recomendada

**1. Banco de Dados - 1 migracao**

Criar tabela `portal_events`:
- `id` UUID PK
- `project_id` UUID FK projects
- `user_id` UUID (quem criou - auth.users)
- `event_type` TEXT (Duvida, Sugestao, Problema, Solicitacao)
- `title` TEXT NOT NULL
- `description` TEXT NOT NULL
- `status` TEXT DEFAULT 'aberto' (aberto, em_analise, resolvido, fechado)
- `admin_response` TEXT NULL
- `responded_at` TIMESTAMPTZ NULL
- `responded_by` UUID NULL
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

Criar tabela `portal_event_photos`:
- `id` UUID PK
- `event_id` UUID FK portal_events
- `photo_url` TEXT NOT NULL (path no Supabase Storage)
- `created_at` TIMESTAMPTZ DEFAULT now()

RLS: clientes podem SELECT/INSERT nos proprios eventos (via `client_portal_access`). Admins podem SELECT/UPDATE todos.

**2. Storage**

Criar bucket `portal_events` no Supabase Storage para fotos dos eventos. Upload direto pelo client SDK (nunca base64 na API).

**3. Frontend - Portal (cliente)**

- Adicionar secao "Comunicacoes" na pagina `PortalProject.tsx`
- Botao "Nova Ocorrencia" abre formulario com: tipo, titulo, descricao, upload de fotos
- Lista de ocorrencias com status e resposta da ARS

**4. Frontend - Admin**

- Na pagina de detalhes da obra (`ProjectDetails.tsx`), adicionar aba/secao "Ocorrencias do Portal"
- Lista de eventos recebidos de clientes
- Possibilidade de responder e alterar status

---

## O que NAO implementar nesta etapa

| Item | Motivo |
|---|---|
| Resumo financeiro no portal | Decisao de negocio pendente. Dados sensiveis |
| Diario de obra | Tabela nao existe. Funcionalidade muito grande para esta etapa |
| Documentos compartilhados | Precisa de mecanismo de marcacao nos documentos existentes |
| APIs REST customizadas | Redundante com Supabase client + RLS |
| Proximos vencimentos | Expoe dados financeiros do contrato ao cliente |

---

## Arquivos a Criar

1. `src/components/portal/PortalEventForm.tsx` - Formulario de nova ocorrencia
2. `src/components/portal/PortalEventsList.tsx` - Lista de ocorrencias do cliente
3. `src/components/projects/PortalEventsAdmin.tsx` - Gestao de ocorrencias pelo admin

## Arquivos a Modificar

1. `src/pages/portal/PortalProject.tsx` - Adicionar secao de comunicacoes
2. `src/pages/ProjectDetails.tsx` - Adicionar aba de ocorrencias do portal

## Migracoes

1. Criar tabelas `portal_events` e `portal_event_photos` com RLS
2. Criar bucket `portal_events` no Storage

## Sequencia

1. Migracao de banco (tabelas + RLS + bucket)
2. Componentes do portal (formulario + lista de eventos)
3. Integrar na pagina da obra do portal
4. Componente admin para responder ocorrencias
5. Integrar na pagina de detalhes da obra (admin)
