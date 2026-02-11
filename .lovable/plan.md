

# Integrar Resend para Envio de Convites do Portal

## Objetivo
Configurar o Resend como servidor de e-mail e modificar a edge function `create-portal-user` para enviar um e-mail de convite personalizado ao cliente quando ele receber acesso ao portal.

## Etapas

### 1. Armazenar a API Key do Resend como Secret
A chave `re_Nf9BHGm1_DLaysMGi9sbCTk6ZN7zbvt3d` sera armazenada como secret do Supabase com o nome `RESEND_API_KEY`, acessivel pela edge function.

### 2. Modificar a Edge Function `create-portal-user`
Apos criar o usuario e conceder acesso, a funcao enviara um e-mail via API do Resend:

- **Novo usuario**: e-mail de boas-vindas com link para definir senha (usando o link de recovery ja gerado pelo `generateLink`)
- **Usuario existente**: e-mail informando que um novo projeto foi compartilhado

O e-mail incluira:
- Nome da obra (buscar da tabela `projects` usando o `project_id`)
- Link direto para o portal (`https://arscorrea.lovable.app/portal`)
- Instrucoes para definir senha (se novo usuario)

### 3. Remetente
O Resend exige um dominio verificado para enviar e-mails. Inicialmente usaremos `onboarding@resend.dev` (remetente de teste do Resend) ate que um dominio proprio seja configurado.

**Importante**: Com `onboarding@resend.dev`, os e-mails so podem ser enviados para o e-mail do dono da conta Resend. Para enviar para qualquer destinatario, sera necessario verificar um dominio proprio no painel do Resend.

---

## Detalhes Tecnicos

### Arquivo modificado
`supabase/functions/create-portal-user/index.ts`

### Logica de envio (pseudo-codigo)
```text
1. Buscar nome da obra: SELECT name FROM projects WHERE id = project_id
2. Gerar link de recovery (se novo usuario)
3. Chamar API Resend:
   POST https://api.resend.com/emails
   Headers: Authorization: Bearer RESEND_API_KEY
   Body: {
     from: "ARS Correa <onboarding@resend.dev>",
     to: email,
     subject: "Convite - Portal ARS Correa",
     html: template com nome da obra + link do portal + instrucoes
   }
```

### Template do e-mail
- Header com logo/nome ARS Correa
- Mensagem de boas-vindas
- Nome da obra compartilhada
- Botao "Acessar Portal" apontando para `/portal`
- Se novo usuario: instrucoes para definir senha com link de recovery
- Rodape com contato

