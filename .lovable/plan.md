

# Admins com Acesso Automatico ao Portal

## Objetivo
Permitir que usuarios admin acessem o portal do cliente (`/portal`) usando suas proprias credenciais, sem precisar de registros na tabela `client_portal_access`. Ao fazer login no portal, se o sistema detectar que e um admin, ele tera acesso a **todas as obras** automaticamente.

## Mudancas Necessarias

### 1. PortalLogin.tsx -- Aceitar admin alem de client
Atualmente o login do portal rejeita quem nao tem role `client`. A mudanca:
- Apos autenticar, verificar se o usuario tem role `admin` OU `client`
- Se for **admin**: redirecionar direto para `/portal/obras` (sempre tera multiplas obras)
- Se for **client**: manter a logica atual (1 obra = direto, N obras = lista)
- Se nao tiver nenhuma das duas roles: rejeitar

### 2. PortalProjectsList.tsx -- Admin ve todas as obras
Atualmente busca obras pela tabela `client_portal_access`. A mudanca:
- Se o usuario for **admin**: buscar direto da tabela `projects` (todas as obras) com join no `clients` pelo `client_id`
- Se o usuario for **client**: manter a busca atual via `client_portal_access`

### 3. PortalProject.tsx -- Admin pode ver qualquer obra
A pagina de detalhes da obra ja busca direto da tabela `projects`. Como admins ja tem politica RLS de SELECT em `projects`, `stages` e `stage_photos`, **nao precisa de alteracao nesta pagina** -- ja funciona.

### 4. ClientRoute.tsx -- Aceitar admin tambem
Atualmente so permite role `client`. A mudanca:
- Aceitar `client` OU `admin`
- Se nao for nenhum dos dois, redirecionar para `/`

### 5. AuthProvider.tsx -- Sem alteracao
O `fetchRole` ja busca a role do usuario. Nenhuma mudanca necessaria.

### 6. Banco de dados -- Sem alteracao
As politicas RLS de `projects`, `stages` e `stage_photos` ja permitem SELECT para authenticated users (admins). Nao precisa de migracao.

---

## Resumo dos Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/portal/PortalLogin.tsx` | Aceitar login de admin, redirecionar para `/portal/obras` |
| `src/pages/portal/PortalProjectsList.tsx` | Admin busca todas as obras direto de `projects` |
| `src/components/auth/ClientRoute.tsx` | Aceitar role `admin` alem de `client` |
| `src/pages/portal/PortalProject.tsx` | Sem alteracao (ja funciona para admin via RLS) |

## Fluxo Resultante

1. Admin acessa `/portal` e faz login com suas credenciais normais
2. Sistema identifica role `admin` e redireciona para `/portal/obras`
3. Pagina lista **todas** as obras do sistema
4. Admin clica em uma obra e visualiza exatamente o que o cliente vera
5. Para voltar ao sistema admin, basta acessar `/` normalmente

