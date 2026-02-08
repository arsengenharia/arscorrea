
## Diagnóstico do “mesmo erro”
Pelos logs e pela linha apontada, o erro atual não é de chave/JWT — é:

- **500** com `{"error":"Maximum call stack size exceeded"}`
- Estoura exatamente nesta linha do edge function:
  - `btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))`

O spread `...new Uint8Array(...)` em um PDF de alguns MB causa **stack overflow** no runtime (Deno/edge), então o processamento falha antes mesmo de chamar a IA.

Além disso, hoje o edge function depende de `SUPABASE_SERVICE_ROLE_KEY`, mas o projeto (via Lovable) só lista `LOVABLE_API_KEY` como secret configurada. Mesmo que esteja funcionando agora, isso é uma fragilidade desnecessária: dá para fazer tudo com o **token do usuário + RLS**.

---

## Objetivo da correção
1) Eliminar o stack overflow do base64.  
2) Deixar o fluxo mais confiável (e mais “perfeito”): **extrair texto nativo primeiro**, e só usar “OCR” quando necessário.  
3) Reduzir dependência de chaves sensíveis (service role).  
4) Melhorar autenticação no edge function (evitar bypass quando `verify_jwt=false`).

---

## Plano de implementação (após aprovação)

### 1) Segurança / chaves (ação recomendada)
- Você colou no chat chaves sensíveis (service role e possivelmente Stripe secret). Isso é **vazamento**.
- Ação recomendada:
  - **Rotacionar** as chaves no dashboard do Supabase/Stripe.
  - Garantir que **nenhuma chave secreta** esteja no frontend.
- No código do app, manter apenas a **anon/public** (já está ok no frontend).

*(Isso não depende de código, mas é importante para segurança.)*

---

### 2) Refatorar o edge function `parse-proposal-pdf` (principal correção)
Arquivo: `supabase/functions/parse-proposal-pdf/index.ts`

#### 2.1 Corrigir base64 sem stack overflow
- Trocar a conversão atual por uma função segura, por exemplo usando stdlib:
  - `import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts"`
  - `const base64 = encodeBase64(new Uint8Array(arrayBuffer))`
- E **mover a validação de tamanho** para antes de qualquer conversão pesada:
  - baixar -> `arrayBuffer` -> checar `byteLength` -> só depois encode

Resultado: elimina `Maximum call stack size exceeded`.

#### 2.2 Autenticação correta com `verify_jwt = false`
Hoje o código faz `supabaseUser.auth.getUser()` sem passar token explicitamente.
Para ficar robusto quando `verify_jwt=false`, ajustar para:
- Extrair token do header:
  - `const token = authHeader.replace("Bearer ", "")`
- Validar explicitamente:
  - `await supabaseUser.auth.getUser(token)` (ou `getClaims(token)` se preferir)

#### 2.3 Remover dependência de `SUPABASE_SERVICE_ROLE_KEY`
Trocar `supabaseAdmin` por operações com `supabaseUser`:
- Buscar o registro `proposal_imports` por `id` (RLS garante “só o dono”)
- Atualizar status (RLS já tem policy de UPDATE do próprio import)
- Baixar o PDF do Storage com o contexto do usuário (as policies do bucket já permitem SELECT por pasta `{user_id}/...`)

Benefícios:
- Menos chance de “minhas chaves supabase” quebrarem o fluxo
- Menos risco de segurança

---

### 3) Pipeline “Perfeito” (texto nativo -> OCR somente se precisar -> IA parser)
Ainda no edge function.

#### 3.1 Extração de texto nativo (sem OCR)
- Adicionar uma lib compatível com Deno/edge para extrair texto do PDF, por exemplo:
  - `jsr:@pdf/pdftext@1.3.2` (simples) **ou**
  - `unpdf` (também serverless-friendly)
- Extrair texto por página e:
  - **limitar a 10 páginas** (se PDF tiver >10 páginas: falhar com mensagem clara e status `failed`)
  - montar `extracted_text` (concatenado)
- Se `extracted_text.length >= 300`:
  - salvar em `proposal_imports.extracted_text`
  - ir direto para o parser LLM (somente texto)

#### 3.2 OCR somente quando necessário (MVP sem chave extra)
Se `extracted_text` vier vazio/insuficiente (<300):
- Usar o próprio modelo via AI Gateway como “OCR” (sem integrar serviço externo):
  - Chamada 1 (OCR): enviar o **PDF** e pedir **APENAS texto** (sem JSON) das primeiras 10 páginas
  - Salvar esse texto em `proposal_imports.extracted_text`
- Depois:
  - Chamada 2 (Parser): enviar o texto para o prompt estrito de JSON (o seu schema)

Observação de confiabilidade:
- Isso aumenta tempo (2 chamadas) apenas para PDFs escaneados, mas cumpre o requisito “2 camadas” e deixa rastreabilidade boa (texto armazenado).

#### 3.3 IA parser (JSON estrito + confidence)
- Manter o seu `PARSER_SYSTEM_PROMPT` (já está bem alinhado)
- Garantir que o payload mande **texto extraído** quando houver (mais determinístico)
- Reforçar validação:
  - se JSON inválido: status `failed` + `extracted_text` salvo para auditoria + `error_message` explicativa

#### 3.4 Status e auditoria
- Ajustar ordem e granularidade:
  - `extracting`: extraindo texto (nativo ou OCR)
  - `parsing`: estruturando em JSON
  - `done` / `failed`
- Em falha: salvar `error_message` e manter `extracted_text` (se houver)

---

### 4) Pequeno ajuste de UX (opcional, mas recomendado)
Arquivo: `src/components/proposals/import/ImportProposalSection.tsx`

- Melhorar mensagem de erro para casos do tipo:
  - “PDF grande demais”
  - “Mais de 10 páginas”
  - “Erro ao extrair texto / OCR”
- (Sem mudar o comportamento principal: continua “aplicar” manual e tudo editável.)

---

## Como vamos validar (checklist de testes)
1) PDF com texto selecionável (1–5 páginas):
   - deve ir direto (sem OCR), status `extracting -> parsing -> done`
2) PDF escaneado (imagem) até 10 páginas:
   - deve fazer OCR (1ª chamada) e depois parsing (2ª chamada)
3) PDF > 10 páginas:
   - falhar com mensagem clara e status `failed`
4) PDF ~15MB:
   - respeitar limite e não estourar stack
5) Confirmar que:
   - Preview abre
   - “Aplicar” preenche o formulário
   - Nada é salvo automaticamente

---

## Arquivos que serão alterados
- `supabase/functions/parse-proposal-pdf/index.ts` (principal)
- (Opcional) `src/components/proposals/import/ImportProposalSection.tsx`

`supabase/config.toml` deve permanecer com:
- `[functions.parse-proposal-pdf] verify_jwt = false`

---

## Nota importante sobre as chaves que você enviou
Eu não vou repetir nem “corrigir” essas chaves no chat. A recomendação segura é **rotacionar** as chaves vazadas e manter segredos apenas em **Supabase Edge Function Secrets**, nunca no frontend.
