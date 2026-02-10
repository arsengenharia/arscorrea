

# Plano: Graficos e Paineis de Analise no Relatorio Gerencial

## Resumo

Implementar graficos interativos (Recharts) na pagina web do relatorio e paineis de analise detalhados, alem de atualizar a edge function para calcular o IEC financeiro corretamente (Custo Real / Custo Previsto) com desdobramentos por tipo (direto/indireto). O PDF continuara usando tabelas formatadas (limitacao do react-pdf).

## Mudancas Necessarias

### 1. Edge Function - Novos Calculos (Backend)

**Arquivo**: `supabase/functions/project-management-report/index.ts`

O IEC atual esta calculado com base em pesos de etapas (progresso fisico). Segundo as formulas do usuario, o IEC deve ser baseado em **custos**: `IEC = Custo Real Acumulado / Custo Previsto Acumulado`.

Adicionar ao JSON de retorno:

```text
"analise_financeira": {
  ... campos existentes ...,
  "iec_total": { "valor": 1.000, "descricao": "acima/abaixo/conforme previsto" },
  "iec_direto": { "valor": 0.950, "descricao": "..." },
  "iec_indireto": { "valor": 1.050, "descricao": "..." },
  "custo_previsto_revisado": 0,  // campo para revisao futura
  "variacao_custo_abs": 0        // diferenca previsto revisado - real
}
```

Tambem corrigir o IFEC para usar a formula correta: `IFEC = Producao Real Acumulada / Producao Prevista Acumulada` (baseado em pesos, nao em contagem de etapas). O IFEC atual divide contagem de etapas concluidas pelo total, mas a formula correta e a razao entre os pesos acumulados.

Calculos a implementar:
- **IFEC** = `completedWeight / totalWeight` (soma dos pesos de todas as etapas como denominador, nao contagem)
- **IEC Total** = `custoTotalReal / custoTotalPrev` (1.000 = conforme previsto)
- **IEC Direto** = `custoDiretoReal / custoDiretoPrev`
- **IEC Indireto** = `custoIndiretoReal / custoIndiretoPrev`
- Status: > 1.000 = "acima do previsto", < 1.000 = "abaixo do previsto", = 1.000 = "conforme previsto"

### 2. Pagina Web - Graficos e Paineis Laterais

**Arquivo**: `src/pages/ProjectReport.tsx`

Reorganizar o layout para incluir graficos e paineis laterais conforme o modelo:

**Layout proposto** (2 colunas em desktop):
- **Coluna esquerda (8/12)**: Graficos
  - Grafico 1: Producao Acumulada Prevista x Real (LineChart com marcadores)
  - Grafico 2: Producao Mensal (BarChart com apenas a coluna "real/produzido")
- **Coluna direita (4/12)**: 3 Paineis de Analise
  - Painel 1 - ANALISE FISICA: IFEC com valor e status
  - Painel 2 - ANALISE FINANCEIRA: IEC total, IEC direto, IEC indireto com status
  - Painel 3 - ANALISE DO CUSTO GERAL: Valores em R$ (custo previsto, previsto revisado, real, variacao) desdobrados em total/direto/indireto

**Graficos (Recharts - ja importado)**:
- LineChart: duas linhas (previsto e real), eixo Y de 0% a 100%, com marcadores na linha Real
- BarChart: barras verticais apenas com "Produzido no Mes", eixo Y percentual mensal

### 3. PDF - Paineis de Analise Adicionais

**Arquivo**: `src/components/reports/pdf/ReportPDF.tsx`

Adicionar os paineis de analise financeira (IEC total/direto/indireto) e o painel de custo geral ao PDF, mantendo as tabelas de producao ja existentes. Os graficos continuam como tabelas no PDF.

Adicionar na Pagina 3 (Analise Financeira):
- Painel IEC: IEC total, direto e indireto com status
- Painel Custo Geral: Custo previsto total/direto/indireto, custo real total/direto/indireto, variacao

### 4. Estilos do PDF

**Arquivo**: `src/components/reports/pdf/reportStyles.ts`

Adicionar estilos para os novos paineis de analise (3 cards lado a lado para IEC).

## Sequencia de Implementacao

1. Atualizar edge function com calculos corretos de IFEC e IEC financeiro (+ deploy)
2. Atualizar `ProjectReport.tsx` com layout de 2 colunas, graficos e paineis laterais
3. Atualizar `ReportPDF.tsx` com paineis de analise financeira e custo geral
4. Atualizar `reportStyles.ts` com estilos dos novos paineis

## Arquivos a Criar/Modificar

1. **`supabase/functions/project-management-report/index.ts`** (editar - novos calculos IEC)
2. **`src/pages/ProjectReport.tsx`** (editar - layout com graficos e paineis)
3. **`src/components/reports/pdf/ReportPDF.tsx`** (editar - paineis de analise)
4. **`src/components/reports/pdf/reportStyles.ts`** (editar - novos estilos)

