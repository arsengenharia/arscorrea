# Plano: Leitura de NF-e PDF via Claude Vision

> **Status:** PLANO (não implementado)
> **Dependência:** Edge functions deployadas + AWS Bedrock ativo

---

## Problema

Quando um PDF de NF-e é enviado (upload ou email), o sistema salva o arquivo mas NÃO extrai dados — cai direto em `aguardando_revisao` com campos vazios. A Nívea precisa digitar tudo manualmente.

O XML da NF-e é o formato oficial e extrai 100% dos dados automaticamente. Mas muitos fornecedores enviam apenas o DANFE (PDF), especialmente por WhatsApp.

## Solução Proposta

Usar **Claude Vision** (multimodal) via AWS Bedrock para "ler" o PDF da NF-e visualmente e extrair os dados estruturados.

## Arquitetura

```
PDF upload → storage
    ↓
parse-nfe-xml (já existente)
    ↓
Detecta arquivo_tipo = 'pdf'
    ↓ (HOJE: cai em aguardando_revisao com campos vazios)
    ↓ (NOVO: chama Claude Vision para extrair dados)
    ↓
Converte PDF → imagem(ns) PNG (via pdf-to-image)
    ↓
Envia imagem(ns) para Claude via Bedrock (messages API com content type image)
    ↓
Claude retorna JSON estruturado com todos os campos
    ↓
Atualiza nfe_inbox com dados extraídos
    ↓
Status = aguardando_revisao (com dados preenchidos, não vazios)
```

## Detalhamento Técnico

### 1. Conversão PDF → Imagem

**Problema:** Deno (edge functions) não tem bibliotecas nativas de renderização PDF.

**Opções:**

| Opção | Como | Prós | Contras |
|---|---|---|---|
| **A. pdf.js no Deno** | `npm:pdfjs-dist` para extrair texto | Leve, sem imagem | Não funciona bem com PDFs escaneados |
| **B. Ghostscript via Docker** | Converter PDF→PNG server-side | Qualidade máxima | Precisa de container/Lambda, não roda em Edge Function |
| **C. Enviar PDF como base64 para Claude** | Claude Sonnet 4.6 aceita PDF direto na API | Mais simples | Bedrock pode não suportar PDF nativo (só imagens) |
| **D. Usar pdftoppm em Lambda auxiliar** | Lambda converte PDF→PNG, retorna imagens | Funciona sempre | Precisa de Lambda + S3 |
| **E. Frontend converte antes de enviar** | Canvas API + pdf.js no browser | Sem backend extra | Mais lento, depende do browser |

**Recomendação: Opção C primeiro, fallback para E.**

A API da Anthropic direta aceita PDFs no content block. O Bedrock pode aceitar também (verificar). Se não aceitar PDF direto, usar opção E (frontend converte para imagem antes de enviar para o storage).

### 2. Prompt para Claude Vision

```
Extraia todos os dados desta Nota Fiscal Eletrônica (DANFE/NF-e).

Responda APENAS com JSON válido neste formato:

{
  "cnpj_emitente": "00000000000000",
  "razao_social": "Nome da Empresa Ltda",
  "numero_nota": "000123",
  "serie": "1",
  "data_emissao": "2026-03-20",
  "valor_total": 2300.00,
  "chave_nfe": "35260312345678000199550010000012341000012345",
  "itens": [
    {
      "xProd": "CIMENTO CP-II 50KG",
      "NCM": "25232900",
      "CFOP": "5102",
      "qCom": 100,
      "uCom": "KG",
      "vUnCom": 15.50,
      "vProd": 1550.00
    }
  ]
}

Se algum campo não estiver legível, use null.
Se não conseguir ler a imagem, retorne {"error": "não foi possível ler o documento"}.
```

### 3. Modificação na Edge Function

**Arquivo:** `supabase/functions/parse-nfe-xml/index.ts`

Atualmente, quando `arquivo_tipo === 'pdf'`:
```typescript
// PDF: fallback — marcar para revisão manual sem dados extraídos
await supabase.from('nfe_inbox').update({
  status: 'aguardando_revisao',
  observacao: 'PDF recebido — preencha os campos manualmente',
}).eq('id', nfe_inbox_id)
```

**Mudança proposta:**
```typescript
if (inbox.arquivo_tipo === 'pdf') {
  // Download PDF from storage
  const { data: pdfData } = await supabase.storage.from('nfe-attachments').download(inbox.arquivo_path);
  const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
  const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

  // Call Claude Vision via Bedrock
  const response = await aws.fetch(bedrockUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "application/pdf",  // ou "image/png" se converter antes
              data: pdfBase64
            }
          },
          {
            type: "text",
            text: PROMPT_EXTRACAO  // prompt acima
          }
        ]
      }],
      max_tokens: 2000,
    }),
  });

  // Parse response
  const result = await response.json();
  const extracted = JSON.parse(result.content[0].text);

  if (extracted.error) {
    // Vision couldn't read it — fall back to manual
    await supabase.from('nfe_inbox').update({
      status: 'aguardando_revisao',
      observacao: 'PDF não legível pela IA — preencha manualmente',
    }).eq('id', nfe_inbox_id);
  } else {
    // Success! Update with extracted data
    // ... same flow as XML (find/create supplier, set fields, etc.)
  }
}
```

### 4. Considerações de Custo

| Métrica | Valor |
|---|---|
| Tamanho típico de DANFE | 1 página, ~200KB como imagem |
| Tokens de input (imagem) | ~1500-2500 tokens |
| Tokens de output (JSON) | ~500 tokens |
| Custo por NF-e (Sonnet via Bedrock) | ~R$ 0,08 |
| Volume estimado ARS | ~50 NF-e/mês |
| **Custo mensal estimado** | **~R$ 4,00** |

### 5. Limitações

| Limitação | Mitigação |
|---|---|
| PDF escaneado com baixa qualidade | Claude Vision lida razoavelmente, mas pode errar em números |
| PDF com múltiplas páginas | Processar apenas a primeira página (dados da NF-e estão na frente) |
| DANFE sem chave de acesso legível | Campo `chave_nfe` fica null — deduplicação manual |
| Bedrock pode não aceitar PDF direto | Converter para PNG no frontend antes do upload |
| Latência (~3-5s por PDF) | Aceitável — parse de XML também leva 2-5s (inclui IA) |

### 6. Validação pós-extração

Após extrair os dados do PDF, comparar com o XML (se disponível):
- Se a mesma NF-e foi enviada como PDF E XML, o XML prevalece
- `chave_nfe` UNIQUE impede duplicidade

Para PDFs sem XML correspondente, os dados extraídos são marcados com:
```json
{ "ai_source": "vision", "ai_confianca": 0.85 }
```

A Nívea revisa antes de aprovar (mesmo fluxo — aguardando_revisao).

## Plano de Implementação

### Fase 1: Validar Bedrock com imagem (1 dia)
1. Testar se Bedrock aceita `media_type: "application/pdf"` no content block
2. Se não aceitar, testar com `image/png` (converter PDF→PNG)
3. Testar com 5 DANFEs reais da ARS
4. Medir acurácia de extração (campos corretos / total de campos)

### Fase 2: Implementar no parse-nfe-xml (1 dia)
1. Adicionar branch de processamento de PDF com Vision
2. Reutilizar a mesma lógica de criação de supplier e categorização IA
3. Marcar `ai_confianca` como 0.85 (menor que XML que tem 1.0)
4. Logar no `ai_query_log` com module="nfe_vision"

### Fase 3: Frontend — Preview de extração (0.5 dia)
1. No NfeReviewDialog, quando a NF-e veio de PDF Vision, mostrar badge "Extraído por IA — verifique os dados"
2. Campos pré-preenchidos são editáveis (Nívea pode corrigir)
3. Itens pré-preenchidos com opção de editar/remover/adicionar

### Fase 4: Testes e ajuste de prompt (0.5 dia)
1. Testar com 10+ DANFEs reais
2. Ajustar prompt para melhorar acurácia
3. Testar edge cases: NF-e de serviço (NFS-e), cupom fiscal, nota de devolução

## Pré-requisitos

- [ ] Edge functions deployadas no Supabase
- [ ] AWS Bedrock secrets configurados
- [ ] Pelo menos 5 DANFEs reais da ARS para teste
- [ ] Verificar se o modelo Bedrock suporta content type PDF ou apenas imagem

## Estimativa

| Item | Tempo | Custo Bedrock |
|---|---|---|
| Implementação | 3 dias | R$ 0 (teste) |
| Custo mensal operação | — | ~R$ 4/mês (50 PDFs) |
| Manutenção | ~2h/mês (ajuste de prompt) | — |
