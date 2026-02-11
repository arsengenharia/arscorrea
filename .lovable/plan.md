
# Analise de Viabilidade: Portal do Cliente

## Resumo Executivo

A proposta e viavel, mas a abordagem sugerida na Etapa 1 e **desnecessariamente complexa**. Ela propoe criar um sistema de autenticacao paralelo (tabela propria de senhas, tokens JWT customizados, endpoints de login/reset). Isso e redundante porque o Supabase **ja oferece tudo isso nativamente** via `auth.users` + RLS.

A abordagem correta e simples: usar o proprio Supabase Auth para criar contas de clientes, diferenciar admin vs cliente via tabela `user_roles`, e usar RLS para restringir o acesso.

---

## O que esta ERRADO na proposta original

| Item proposto | Problema |
|---|---|
| Tabela `portal_clientes_usuarios` com `senha_hash` | Reinventa o Supabase Auth. Nunca armazene senhas manualmente |
| `POST /portal/login` customizado | Supabase Auth ja faz isso com `signInWithPassword` |
| `POST /portal/forgot-password` customizado | Supabase Auth ja tem `resetPasswordForEmail` |
| Token JWT customizado | Supabase ja gera JWT automaticamente |
| Coluna `url_portal_obra` na tabela projects | Desnecessario -- a URL e simplesmente `/portal/obras/:projectId` |
| Coluna `responsavel_portal_id` na tabela clients | Complexidade desnecessaria para o caso de uso |

---

## Abordagem Recomendada (Simples e Segura)

### Arquitetura

```text
+------------------+     +----------------+     +-----------+
| auth.users       |---->| user_roles     |     | projects  |
| (Supabase nativo)|     | user_id + role |     | client_id |
+------------------+     +----------------+     +-----------+
         |                                            |
         v                                            v
+------------------+                           +-----------+
| client_portal    |                           | stages    |
| _access          |                           | + photos  |
| user_id          |                           +-----------+
| client_id        |
+------------------+
```

### 1. Banco de Dados (3 migracoes)

**Migracao 1: Tabela `user_roles`** (conforme instrucoes de seguranca do sistema)
- Enum `app_role` com valores `admin` e `client`
- Tabela `user_roles` com `user_id` (FK auth.users) e `role`
- Funcao `has_role()` SECURITY DEFINER
- Todos os usuarios admin existentes recebem role `admin`

**Migracao 2: Tabela `client_portal_access`**
- `id` UUID PK
- `user_id` UUID FK auth.users -- conta Supabase do cliente
- `client_id` UUID FK clients -- qual cliente ele representa
- `project_id` UUID FK projects -- qual obra ele pode ver
- `created_by` UUID -- admin que criou o acesso
- `created_at` TIMESTAMP
- Constraint UNIQUE(user_id, project_id)

**Migracao 3: Politicas RLS atualizadas**
- Tabela `projects`: adicionar politica SELECT para role `client` que so permite ver projetos listados em `client_portal_access`
- Tabela `stages`: idem, via join com projects
- Tabela `stage_photos`: idem
- Manter todas as politicas admin existentes inalteradas

### 2. Frontend -- Rotas do Portal

Adicionar rotas publicas (sem `ProtectedRoute` admin) dentro do mesmo app React:

- `/portal` -- Login do cliente (pagina simples e limpa)
- `/portal/obra/:projectId` -- Visualizacao da obra (read-only)

O `AuthProvider` sera expandido para expor a `role` do usuario. O `ProtectedRoute` verificara se o usuario e admin. Um novo `ClientRoute` verificara se e cliente e se tem acesso aquela obra.

### 3. Paginas do Portal do Cliente

**Login (`/portal`)**
- Formulario simples: email + senha
- Usa `supabase.auth.signInWithPassword` (mesmo mecanismo)
- Apos login, redireciona para `/portal/obra/:projectId` (se tiver apenas 1 obra) ou lista de obras

**Visualizacao da Obra (`/portal/obra/:projectId`)**
- Layout proprio (sem o menu admin)
- Header com logo ARS + nome do cliente + botao sair
- Cards com informacoes da obra: nome, status, datas, progresso geral
- Lista de etapas com status (pendente/iniciado/concluido)
- Fotos de cada etapa (galeria)
- Tudo READ-ONLY -- cliente nao edita nada

### 4. Gestao de Acesso (lado admin)

Na pagina de detalhes do projeto (`/obras/:projectId`), adicionar um botao "Gerenciar Acesso Portal":
- Dialog/Sheet com formulario para criar acesso
- Campos: email do cliente, nome
- Ao salvar: cria usuario no Supabase Auth (via edge function com service_role), atribui role `client`, cria registro em `client_portal_access`
- O cliente recebe email de confirmacao do Supabase Auth (nativo)

---

## Arquivos a Criar

1. `src/pages/portal/PortalLogin.tsx` -- Tela de login do cliente
2. `src/pages/portal/PortalProject.tsx` -- Visualizacao da obra
3. `src/components/portal/PortalLayout.tsx` -- Layout limpo sem menu admin
4. `src/components/portal/PortalStagesList.tsx` -- Lista de etapas read-only
5. `src/components/auth/ClientRoute.tsx` -- Protetor de rota para clientes
6. `src/components/projects/ManagePortalAccessDialog.tsx` -- Dialog para admin gerenciar acessos
7. `supabase/functions/create-portal-user/index.ts` -- Edge function para criar usuario cliente

## Arquivos a Modificar

1. `src/App.tsx` -- Adicionar rotas `/portal/*`
2. `src/components/auth/AuthProvider.tsx` -- Expor role do usuario
3. `src/pages/ProjectDetails.tsx` -- Botao "Gerenciar Acesso Portal"

## Migracoes de Banco

1. Criar enum `app_role`, tabela `user_roles`, funcao `has_role()`
2. Criar tabela `client_portal_access`
3. Adicionar politicas RLS para role `client` em `projects`, `stages`, `stage_photos`

---

## Sequencia de Implementacao

1. Migracoes de banco (roles + client_portal_access + RLS)
2. Edge function `create-portal-user`
3. Expandir AuthProvider com role
4. Criar ClientRoute
5. Criar PortalLayout + PortalLogin + PortalProject
6. Criar ManagePortalAccessDialog no admin
7. Registrar rotas no App.tsx

---

## O que NAO sera implementado nesta etapa

| Item | Motivo |
|---|---|
| Redefinicao de senha customizada | Supabase Auth ja oferece nativamente |
| Servico de email customizado | Supabase Auth envia emails de convite/reset automaticamente |
| API REST separada (/portal/login, /portal/profile) | Desnecessario -- o Supabase client faz tudo |
| Coluna `acesso_portal_cliente` em projects | Substituido pela tabela `client_portal_access` que e mais flexivel |
| Edicao de perfil pelo cliente | Complexidade desnecessaria para MVP -- cliente so visualiza a obra |
