# ARS Correa — Guia de Deploy para Produção

**Branch:** `redesign` → `main`
**Data:** 2026-03-28

---

## Pré-requisitos

- Acesso ao [Supabase Dashboard](https://supabase.com/dashboard/project/qajzskxuvxsbvuyuvlnd)
- Supabase CLI instalado (`npm install -g supabase`)
- Acesso ao terminal com Git configurado
- Credenciais AWS (já no vault)

---

## Etapa 1: Habilitar Extensões no Supabase Dashboard

Acessar: **Dashboard → Database → Extensions**

| Extensão | Para que serve | Como ativar |
|---|---|---|
| `pg_net` | Trigger que chama edge function quando NF-e chega | Buscar "pg_net" → Enable |
| `pg_cron` | Cron diário de auditoria + snapshot de margem | Buscar "pg_cron" → Enable |

**Após habilitar**, aplicar as migrations pendentes:

```sql
-- Executar no SQL Editor do Supabase Dashboard

-- 1. Configurar variáveis do banco (necessário para pg_net trigger)
ALTER DATABASE postgres SET app.supabase_url = 'https://qajzskxuvxsbvuyuvlnd.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<SERVICE_ROLE_KEY do Dashboard → Settings → API>';

-- 2. Criar trigger de auto-parse NF-e (requer pg_net)
CREATE OR REPLACE FUNCTION trigger_parse_nfe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'recebido' AND NEW.origem != 'entrada_manual' THEN
    PERFORM net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/parse-nfe-xml',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object('nfe_inbox_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_nfe_inbox_insert ON nfe_inbox;
CREATE TRIGGER on_nfe_inbox_insert
  AFTER INSERT ON nfe_inbox
  FOR EACH ROW EXECUTE FUNCTION trigger_parse_nfe();

-- 3. Criar cron jobs (requer pg_cron)
SELECT cron.schedule(
  'daily-audit-scan',
  '0 9 * * *',
  $$SELECT detect_financial_anomalies(); SELECT detect_data_quality_issues();$$
);

SELECT cron.schedule(
  'monthly-margin-snapshot',
  '0 10 1 * *',
  $$SELECT capture_margin_snapshots();$$
);

SELECT cron.schedule(
  'fetch-nfe-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/fetch-nfe-from-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

---

## Etapa 2: Configurar Secrets das Edge Functions

Acessar: **Dashboard → Edge Functions → Manage Secrets**

Adicionar estes secrets:

| Secret | Valor | Para que serve |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | (ver vault CREDENCIAIS-SENSIVEL.md) | Bedrock (IA) |
| `AWS_SECRET_ACCESS_KEY` | (ver vault CREDENCIAIS-SENSIVEL.md) | Bedrock (IA) |
| `AWS_REGION` | `us-east-1` | Bedrock (IA) |
| `IMAP_HOST` | `imap.hostinger.com` | Busca NF-e por email |
| `IMAP_PORT` | `993` | Busca NF-e por email |
| `IMAP_USER` | (ver vault CREDENCIAIS-SENSIVEL.md) | Busca NF-e por email |
| `IMAP_PASS` | (ver vault CREDENCIAIS-SENSIVEL.md) | Busca NF-e por email |
| `ANTHROPIC_API_KEY` | (ver vault CREDENCIAIS-SENSIVEL.md) | Classificação NF-e (alternativo ao Bedrock) |

---

## Etapa 3: Deploy das Edge Functions

No terminal, na pasta do projeto:

```bash
cd /tmp/arscorrea

# Login no Supabase (se necessário)
npx supabase login

# Deploy todas as 7 edge functions
npx supabase functions deploy ai-chat --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy fetch-nfe-from-email --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy parse-nfe-xml --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy approve-nfe --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy import-bank-statement --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy normalize-nfe-items --project-ref qajzskxuvxsbvuyuvlnd
npx supabase functions deploy summarize-document --project-ref qajzskxuvxsbvuyuvlnd
```

**Verificar:** Dashboard → Edge Functions — deve mostrar 7 functions (+ as 3 existentes = 10 total)

---

## Etapa 4: Teste Pré-Merge

Checklist de verificação antes do merge:

### 4.1 Verificar edge functions respondem
```bash
# Testar ai-chat (deve retornar erro de auth, não 404)
curl -X POST https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"teste"}'
# Esperado: 401 Unauthorized (sem JWT — correto)

# Testar fetch-nfe-from-email
curl -X POST https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/fetch-nfe-from-email \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
# Esperado: {"processed":0,"errors":0} (sem emails novos)
```

### 4.2 Verificar cron está agendado
```sql
-- No SQL Editor do Supabase
SELECT * FROM cron.job;
-- Esperado: 3 jobs (daily-audit-scan, monthly-margin-snapshot, fetch-nfe-emails)
```

### 4.3 Testar fluxo NF-e completo
1. Enviar email com XML para nfe@ars.eng.br
2. Aguardar 5 min (cron)
3. Verificar `/financeiro/nfe` — NF-e deve aparecer em Pendentes com dados extraídos
4. Revisar e aprovar
5. Verificar lançamento criado em `/financeiro/lancamentos`

### 4.4 Testar assistente IA
1. Abrir sistema logado
2. Clicar no botão Bot (bottom-right)
3. Perguntar "qual o saldo geral?"
4. Verificar resposta com dados reais

### 4.5 Verificar build de produção
```bash
cd /tmp/arscorrea && npm run build
# Esperado: build sem erros
```

---

## Etapa 5: Merge para Produção

```bash
cd /tmp/arscorrea

# Garantir branch redesign atualizada
git checkout redesign
git pull origin redesign

# Merge na main
git checkout main
git pull origin main
git merge redesign --no-ff -m "Merge redesign: módulo financeiro v2 + NF-e + IA + indicadores"

# Push
git push origin main
```

**ATENÇÃO:** Se o deploy é via Lovable/Vercel e faz build automático da main, o sistema vai para produção imediatamente após o push.

---

## Etapa 6: Pós-Deploy

### 6.1 Verificar em produção
- Acessar a URL de produção
- Login com falecompedrosilveira@gmail.com
- Navegar por todas as tabs do Financeiro
- Testar novo lançamento (modo rápido)
- Testar chat IA

### 6.2 Executar scans iniciais
```sql
-- No SQL Editor, rodar manualmente a primeira vez
SELECT detect_financial_anomalies();
SELECT detect_data_quality_issues();
SELECT capture_margin_snapshots();
SELECT detect_price_outliers();
```

### 6.3 Monitorar
- Dashboard → Edge Functions → Logs (verificar erros)
- Dashboard → Database → Logs (verificar queries lentas)
- Tabela `ai_query_log` — verificar chamadas IA
- Tabela `audit_log` — verificar rastreabilidade
- Tabela `anomalies` — verificar detecções

---

## Rollback (se necessário)

Se algo der errado após o merge:

```bash
# Reverter merge na main
git checkout main
git revert -m 1 HEAD
git push origin main
```

As edge functions podem ser desabilitadas individualmente no Dashboard.
Os cron jobs podem ser removidos:
```sql
SELECT cron.unschedule('daily-audit-scan');
SELECT cron.unschedule('monthly-margin-snapshot');
SELECT cron.unschedule('fetch-nfe-emails');
```

---

## Resumo de Credenciais Necessárias

| Item | Onde configurar |
|---|---|
| AWS Keys | Supabase Secrets |
| IMAP nfe@ars.eng.br | Supabase Secrets |
| Anthropic API Key | Supabase Secrets |
| Supabase Service Role Key | SQL Editor (ALTER DATABASE) |
| Supabase URL | SQL Editor (ALTER DATABASE) |
| pg_net extension | Dashboard → Extensions |
| pg_cron extension | Dashboard → Extensions |
