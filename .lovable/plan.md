
# Corrigir Fluxo de Senha do Portal (Todos os Usuarios + "Esqueci Senha")

## Problema Identificado
Na edge function `create-portal-user`, o link de recuperacao de senha (`generateLink`) so e gerado para **novos usuarios** (linha 257). Quando o usuario ja existe, o e-mail enviado contem apenas um link direto para `/portal` (template `existingUserHtml`), sem nenhum token de recuperacao. Por isso o `PASSWORD_RECOVERY` nunca dispara e o usuario cai direto no login.

## Solucao

### 1. Edge Function: Gerar recovery link para TODOS os convites
**Arquivo:** `supabase/functions/create-portal-user/index.ts`

- Remover a condicao `if (!existingUser)` que envolve o `generateLink`
- Gerar o recovery link sempre, independentemente de o usuario ser novo ou existente
- Atualizar o template de e-mail para usuarios existentes (`existingUserHtml`) para usar o `recoveryLink` em vez do link direto ao portal
- Alterar o texto do botao de "Acessar Portal" para "Definir Senha e Acessar" no template de existentes
- Passar `recoveryLink` para `sendInviteEmail` em ambos os casos

Mudancas especificas:
```text
// ANTES (linha 257):
if (!existingUser) {
  const { data: linkData } = await adminClient.auth.admin.generateLink(...)
  ...
}

// DEPOIS:
const { data: linkData } = await adminClient.auth.admin.generateLink({
  type: "recovery",
  email,
  options: {
    redirectTo: "https://arscorrea.lovable.app/portal/redefinir-senha",
  },
});
if (linkData?.properties?.action_link) {
  recoveryLink = linkData.properties.action_link;
}
```

E no template `existingUserHtml`, trocar o `href` do botao de `${portalUrl}` para `${recoveryLink || portalUrl}`.

### 2. Portal Login: Adicionar "Esqueci minha senha"
**Arquivo:** `src/pages/portal/PortalLogin.tsx`

- Adicionar link "Esqueci minha senha" abaixo do botao de login
- Ao clicar, exibir um campo de e-mail e enviar `supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://arscorrea.lovable.app/portal/redefinir-senha" })`
- Mostrar mensagem de confirmacao apos envio

### 3. Nenhuma mudanca no AuthProvider
O `PASSWORD_RECOVERY` redirect ja esta implementado corretamente. O problema era que o evento nunca disparava porque nao havia token de recuperacao no link.

## Resumo do Fluxo Corrigido

1. Admin convida email (novo ou existente) --> Edge function gera recovery link --> E-mail enviado com botao "Definir Senha"
2. Cliente clica no link --> Supabase processa o token --> Redireciona ao app --> `AuthProvider` detecta `PASSWORD_RECOVERY` --> Navega para `/portal/redefinir-senha`
3. Cliente define senha --> Clica "Acessar Portal" --> Login normal
4. Se o cliente esquecer a senha: clica "Esqueci minha senha" no `/portal` --> Recebe e-mail de recuperacao --> Mesmo fluxo do passo 2
