

# Plano: Exportacao PDF do Relatorio Gerencial por Obra

## Resumo
Criar um documento PDF completo usando `@react-pdf/renderer` (ja instalado no projeto) para o Relatorio Gerencial, seguindo o padrao existente nos PDFs de contratos e detalhes de obra. O PDF incluira informacoes da obra/cliente, tabelas de producao fisica, tabelas financeiras e KPIs. Como `@react-pdf/renderer` nao suporta graficos nativos, os graficos serao representados como tabelas formatadas no PDF. Um botao "Exportar PDF" sera adicionado na pagina do relatorio.

## 1. Novos Arquivos

### 1.1 `src/components/reports/pdf/ReportPDF.tsx`
Componente principal do documento PDF usando `@react-pdf/renderer`:
- **Pagina 1**: Header com logo ARS Correa + data, titulo do relatorio, secao de informacoes da obra (nome, gestor, inicio, previsao, prazo, status) e informacoes do cliente (nome, codigo, responsavel, telefone, endereco)
- **Pagina 2**: Analise Fisica - Cards de IFEC e IEC com valores e descricoes, tabela de producao mensal (colunas: Mes/Ano, Previsto %, Real %, Variacao %), tabela de producao acumulada (mesmo formato)
- **Pagina 3**: Analise Financeira - Tabela de custos (Direto Previsto/Real, Indireto Previsto/Real, Total), tabela de receitas (Prevista/Realizada), indicadores consolidados (Saldo, Margem de Lucro), observacoes gerenciais

### 1.2 `src/components/reports/pdf/reportStyles.ts`
Estilos do PDF seguindo o padrao visual do `contractStyles.ts`:
- Cores corporativas (azul #1e40af para titulos)
- Header com logo e data
- Tabelas com header cinza (#f3f4f6) e bordas sutis
- Cards de KPI com destaque visual
- Footer com dados da empresa
- Tipografia Helvetica, tamanho 10-14

### 1.3 `src/components/reports/ReportPDFButton.tsx`
Componente com `PDFDownloadLink` do `@react-pdf/renderer`:
- Recebe os dados do relatorio como prop (o mesmo JSON retornado pela edge function)
- Renderiza um botao "Exportar PDF" com icone `FileDown`
- Gera nome do arquivo: `relatorio-gerencial-{nome_obra}.pdf`

## 2. Arquivos Modificados

### 2.1 `src/pages/ProjectReport.tsx`
- Importar e adicionar o componente `ReportPDFButton` ao lado do botao de voltar no header
- Passar os dados (`data`) carregados da edge function como prop para o botao

## 3. Estrutura do PDF (Secoes)

```text
+------------------------------------------+
| [Logo ARS Correa]     [Data: dd/MM/yyyy] |
| ---------------------------------------- |
| RELATORIO GERENCIAL - {Nome da Obra}     |
|                                          |
| INFORMACOES DA OBRA                      |
| Nome: ...  | Gestor: ...                 |
| Inicio: .. | Previsao: ..               |
| Prazo: ... | Status: ...                |
|                                          |
| INFORMACOES DO CLIENTE                   |
| Nome: ...  | Codigo: ...                |
| Responsavel: ... | Telefone: ...        |
| Endereco: ...                            |
+------------------------------------------+

+------------------------------------------+
| [Logo]                       [Data]      |
| ---------------------------------------- |
| ANALISE FISICA                           |
|                                          |
| IFEC: XX%  |  IEC: XX%                  |
|                                          |
| PRODUCAO MENSAL (%)                      |
| Mes/Ano | Previsto | Real | Variacao    |
| Jan/25  |   10.0   | 8.0  |  -2.0      |
| ...                                      |
|                                          |
| PRODUCAO ACUMULADA (%)                   |
| Mes/Ano | Previsto | Real | Variacao    |
| Jan/25  |   10.0   | 8.0  |  -2.0      |
| ...                                      |
+------------------------------------------+

+------------------------------------------+
| [Logo]                       [Data]      |
| ---------------------------------------- |
| ANALISE FINANCEIRA                       |
|                                          |
| CUSTOS                                   |
| Tipo     | Previsto      | Realizado     |
| Direto   | R$ xxx        | R$ xxx        |
| Indireto | R$ xxx        | R$ xxx        |
| TOTAL    | R$ xxx        | R$ xxx        |
|                                          |
| RECEITAS                                 |
| Prevista: R$ xxx | Realizada: R$ xxx    |
|                                          |
| RESULTADO                                |
| Saldo da Obra: R$ xxx                   |
| Margem de Lucro: XX%                    |
|                                          |
| [Footer: ARS Engenharia]                |
+------------------------------------------+
```

## 4. Detalhes Tecnicos

- **Biblioteca**: `@react-pdf/renderer` (ja instalada, versao ^4.3.0)
- **Padrao seguido**: Mesmo padrao de `ContractPDF.tsx` e `ProjectDetailsPDF.tsx`
- **Graficos**: Representados como tabelas no PDF (react-pdf nao suporta SVG/canvas de graficos). As tabelas conterao os mesmos dados vistos nos graficos da interface
- **Formatacao monetaria**: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
- **Formatacao de datas**: `date-fns` com locale `ptBR`
- **Paginacao**: Cada secao principal em pagina separada usando multiplos `<Page>` components

## 5. Sequencia de Implementacao

1. Criar `reportStyles.ts` com estilos do PDF
2. Criar `ReportPDF.tsx` com o documento completo
3. Criar `ReportPDFButton.tsx` com o botao de download
4. Modificar `ProjectReport.tsx` para incluir o botao

