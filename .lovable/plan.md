

# Perfil do Usuario com Avatar no Menu Superior

## Resumo

Substituir a exibicao do e-mail no menu superior por um avatar clicavel que abre um dropdown com acesso ao perfil, notificacoes e logout. Criar uma tabela `profiles` no banco para armazenar nome e foto, uma pagina de perfil para edicao, e uma pagina de notificacoes (inicialmente vazia, preparada para uso futuro).

## O que muda para o usuario

- No lugar do e-mail + botao "Sair", aparece um **avatar circular** com as iniciais do nome (ou foto, se cadastrada)
- Ao clicar no avatar, abre um **dropdown** com: nome/e-mail, link para "Meu Perfil", link para "Notificacoes", e "Sair"
- Na pagina **Meu Perfil** (`/perfil`): campo para editar o nome de exibicao, area para upload de foto de perfil, e botao salvar
- Na pagina **Notificacoes** (`/notificacoes`): tela preparada com mensagem "Nenhuma notificacao" (sera populada na proxima etapa)

## Detalhes Tecnicos

### 1. Migracao de Banco de Dados

Criar tabela `profiles`:

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Criar tabela `notifications` (vazia, para uso futuro):

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

Criar bucket de storage `avatars` para armazenar as fotos de perfil.

### 2. Hook `useProfile` (`src/hooks/use-profile.ts`)

- Busca o perfil do usuario logado na tabela `profiles`
- Faz upsert ao salvar nome/foto
- Upload de imagem para o bucket `avatars` do Supabase Storage
- Retorna `displayName`, `avatarUrl`, funcoes de save e upload

### 3. Componente `UserProfileMenu` (`src/components/layout/UserProfileMenu.tsx`)

- Substitui a area de e-mail + botao Sair no `TopNavigation`
- Exibe um `Avatar` com foto ou iniciais do nome (fallback: iniciais do e-mail)
- Ao clicar, abre um `DropdownMenu` com:
  - Header: nome + e-mail
  - Item: "Meu Perfil" (navega para `/perfil`)
  - Item: "Notificacoes" (navega para `/notificacoes`)
  - Separador
  - Item: "Sair" (executa signOut)

### 4. Pagina de Perfil (`src/pages/Profile.tsx`)

- Rota: `/perfil` (protegida)
- Layout com card contendo:
  - Avatar grande com botao de upload de foto
  - Campo "Nome de exibicao" editavel
  - E-mail (somente leitura)
  - Botao "Salvar"
- Usa o hook `useProfile` para carregar e salvar dados

### 5. Pagina de Notificacoes (`src/pages/Notifications.tsx`)

- Rota: `/notificacoes` (protegida)
- Layout simples com titulo "Notificacoes" e estado vazio: icone + "Nenhuma notificacao no momento"
- Preparada para receber listagem futura

### 6. Atualizacoes em arquivos existentes

| Arquivo | Alteracao |
|---|---|
| `src/components/layout/TopNavigation.tsx` | Substituir area de e-mail/Sair pelo `UserProfileMenu` (desktop e mobile) |
| `src/App.tsx` | Adicionar rotas `/perfil` e `/notificacoes` |
| `src/integrations/supabase/types.ts` | Adicionar tipos das tabelas `profiles` e `notifications` |

### 7. Fluxo do Avatar

```text
+------------------+
|  TopNavigation   |
|                  |
|  [nav items]  [Avatar] <-- clicavel
|                  |
+------------------+
        |
        v
  +-------------------+
  | DropdownMenu      |
  |                   |
  |  Nome do Usuario  |
  |  email@exemplo    |
  |  ─────────────    |
  |  Meu Perfil       |
  |  Notificacoes     |
  |  ─────────────    |
  |  Sair             |
  +-------------------+
```

