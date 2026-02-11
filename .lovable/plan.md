
# Corrigir Fluxo de Redefinicao de Senha do Portal

## Problema
Quando o cliente clica no link de recuperacao de senha no e-mail, o Supabase processa o token e redireciona de volta ao app. Porem, o redirecionamento esta caindo na pagina de login (`/portal`) em vez da pagina de redefinicao de senha (`/portal/redefinir-senha`). Isso acontece porque o Supabase pode nao estar respeitando o `redirectTo` configurado no `generateLink`, ou esta redirecionando para a Site URL padrao.

## Solucao
Adicionar deteccao do evento `PASSWORD_RECOVERY` diretamente no `AuthProvider`, que e o componente central de autenticacao. Quando esse evento for detectado, o app redirecionara automaticamente para `/portal/redefinir-senha`, independentemente de onde o usuario tenha caido inicialmente.

## Etapas

### 1. Modificar `AuthProvider.tsx`
No listener `onAuthStateChange`, adicionar tratamento para o evento `PASSWORD_RECOVERY`:
- Quando detectar esse evento, navegar para `/portal/redefinir-senha`
- Isso garante que, mesmo que o Supabase redirecione para `/portal` ou `/`, o app corrigira a rota automaticamente

### 2. Ajustar `PortalResetPassword.tsx`
- Garantir que a pagina funcione corretamente quando o usuario chega via redirecionamento do `AuthProvider`
- A pagina ja detecta `PASSWORD_RECOVERY` e `SIGNED_IN` no seu proprio `useEffect`, entao deve funcionar sem alteracoes significativas

## Detalhes Tecnicos

### Arquivo: `src/components/auth/AuthProvider.tsx`
Dentro do `onAuthStateChange`, adicionar antes do tratamento de `SIGNED_OUT`:

```text
if (event === 'PASSWORD_RECOVERY') {
  navigate("/portal/redefinir-senha");
}
```

Isso intercepta o evento de recuperacao de senha em qualquer ponto do app e redireciona para a pagina correta.

### Impacto
- Nenhuma alteracao em rotas ou na edge function
- Funciona tanto para novos usuarios quanto para redefinicoes de senha futuras
- Nao afeta o fluxo de login normal (admin ou cliente)
