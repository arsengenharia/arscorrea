# ARS Engenharia — Teste do Modulo NF-e (Pre-Deploy)

**Data:** 2026-03-27
**Branch:** `redesign`
**URL:** http://localhost:5173
**Login:** falecompedrosilveira@gmail.com / Sucesso23!

---

## O que pode ser testado AGORA (sem deploy de edge functions)

- UI da pagina NF-e (4 abas)
- Upload manual de XML/PDF (salva no storage + insere na nfe_inbox)
- Insercao manual de NF-e (cria lancamento direto)
- Badge no menu (contagem de pendentes)
- Dialog de revisao (abre, exibe dados, selects funcionam)
- Historico (lista itens da nfe_inbox)

## O que NAO funciona sem deploy

- Auto-parse do XML (pg_net trigger chama edge function que nao esta deployada)
- Botao "Aprovar e Lancar" no dialog (chama approve-nfe edge function)
- Busca automatica de email IMAP (edge function nao deployada)

---

## Teste 1: Navegacao e Tab NF-e

| # | Acao | Resultado Esperado |
|---|---|---|
| 1.1 | Clicar "Financeiro" no menu | Navega para `/financeiro/visao-geral` |
| 1.2 | Verificar barra de tabs | 6 tabs: Visao Geral, Lancamentos, Conciliacao, Rateio, **NF-e**, Configuracoes |
| 1.3 | Clicar tab "NF-e" | Navega para `/financeiro/nfe` |
| 1.4 | Verificar sub-tabs na pagina NF-e | 4 tabs internas: Pendentes, Historico, Upload Manual, Insercao Manual |

**Criterio:** Todas as tabs navegam corretamente. Pagina NF-e carrega sem erros.

---

## Teste 2: Tab "Insercao Manual"

**Objetivo:** Testar o formulario de entrada manual de NF-e (fluxo completo sem edge functions).

| # | Acao | Resultado Esperado |
|---|---|---|
| 2.1 | Clicar tab "Insercao Manual" | Formulario com campos estruturados |
| 2.2 | Verificar campos | CNPJ, Nome Fornecedor, N Nota, Data Emissao, Valor, Obra, Conta Bancaria, Categoria, Observacoes |
| 2.3 | Preencher conforme dados abaixo | Campos aceitam valores |
| 2.4 | Clicar "Registrar NF-e" | Toast "NF-e registrada com sucesso!" |
| 2.5 | Verificar em `/financeiro/lancamentos` | Novo lancamento aparece com tipo "NF-e" |
| 2.6 | Verificar em `/fornecedores` | Fornecedor "Material Teste Ltda" criado automaticamente |

### Dados de Teste — Insercao Manual

| Campo | Valor |
|---|---|
| CNPJ | 12.345.678/0001-99 |
| Nome Fornecedor | Material Teste Ltda |
| N Nota | 001234 |
| Data Emissao | 2026-03-25 |
| Valor Total | 3500.00 |
| Obra | (selecionar qualquer obra ativa) |
| Conta Bancaria | (selecionar Banco Inter ou outra conta existente) |
| Categoria | [CV] Materiais de Obra |
| Observacoes | Teste de insercao manual NF-e |

**Criterio:** Lancamento criado com valor -R$ 3.500,00 (negativo = saida). Fornecedor auto-criado com CNPJ limpo (12345678000199). Saldo da obra recalculado.

---

## Teste 3: Tab "Upload Manual"

| # | Acao | Resultado Esperado |
|---|---|---|
| 3.1 | Clicar tab "Upload Manual" | Area de drag-and-drop visivel |
| 3.2 | Verificar texto | "Arraste arquivos XML ou PDF de NF-e aqui, ou clique para selecionar" |
| 3.3 | Clicar "Selecionar Arquivos" | Dialog de arquivo abre, aceita .xml e .pdf |
| 3.4 | Selecionar um arquivo XML de teste | Botao muda para "Enviando..." |
| 3.5 | Apos upload | Toast "1 arquivo(s) enviado(s) para processamento" |
| 3.6 | Verificar tab "Pendentes" | Novo item aparece (mas com dados vazios — parse nao roda sem edge function) |

### Arquivo XML de teste

Se nao tiver um XML de NF-e real, criar um arquivo `teste-nfe.xml` com conteudo minimo:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260312345678000199550010000012341000012345">
      <ide><nNF>12345</nNF><dhEmi>2026-03-20T10:00:00-03:00</dhEmi></ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Cimento ABC Ltda</xNome>
        <xFant>Cimento ABC</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <xProd>CIMENTO CP-II 50KG</xProd>
          <NCM>25232900</NCM>
          <CFOP>5102</CFOP>
          <vProd>1500.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <xProd>AREIA MEDIA M3</xProd>
          <NCM>25059000</NCM>
          <CFOP>5102</CFOP>
          <vProd>800.00</vProd>
        </prod>
      </det>
      <total><ICMSTot><vNF>2300.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>
```

**Criterio:** Upload salva arquivo no storage. Registro criado na nfe_inbox com status "recebido". Sem parse automatico (esperado nesta fase de teste).

---

## Teste 4: Tab "Pendentes"

| # | Acao | Resultado Esperado |
|---|---|---|
| 4.1 | Clicar tab "Pendentes" | Tabela vazia OU itens com status "aguardando_revisao" |
| 4.2 | Se existir item pendente, clicar "Revisar" | Dialog de revisao abre |
| 4.3 | Verificar campos readonly | Fornecedor, CNPJ, N Nota, Valor, Data, Origem, Chave NF-e |
| 4.4 | Verificar selects editaveis | Obra, Conta Bancaria, Categoria |
| 4.5 | Verificar sugestao IA | Badge com categoria sugerida + % confianca (se parser rodou) |
| 4.6 | Clicar "Aprovar e Lancar" | Erro esperado (edge function nao deployada) — toast de erro |
| 4.7 | Clicar "Rejeitar" | Item removido da lista, status muda para "rejeitado" |

**Nota:** Sem edge functions deployadas, o botao "Aprovar" vai falhar. O botao "Rejeitar" funciona pois faz update direto via Supabase client.

---

## Teste 5: Tab "Historico"

| # | Acao | Resultado Esperado |
|---|---|---|
| 5.1 | Clicar tab "Historico" | Tabela com todos os registros da nfe_inbox (qualquer status) |
| 5.2 | Verificar colunas | Data, Fornecedor, CNPJ, N Nota, Valor, Categoria IA, Origem, Status |
| 5.3 | Verificar badges de status | Cores diferentes: recebido=azul, processando=amarelo, aprovado=verde, rejeitado=vermelho, duplicata=cinza, erro=vermelho |

---

## Teste 6: Badge no Menu

| # | Acao | Resultado Esperado |
|---|---|---|
| 6.1 | Verificar item "Financeiro" no menu principal | Se houver itens com status "aguardando_revisao", badge ambar com numero aparece |
| 6.2 | Se nao houver pendentes | Badge nao aparece |
| 6.3 | Inserir item via upload manual | Badge pode aparecer (se trigger+parse funcionar) ou nao (se nao tiver parse) |

**Nota:** O badge conta registros com status `aguardando_revisao`. Como o parse nao roda sem deploy, itens ficam como `recebido` e o badge nao conta eles. Para testar o badge, insira manualmente um registro:

```sql
INSERT INTO nfe_inbox (status, origem, arquivo_path, arquivo_tipo, razao_social, cnpj, numero_nota, valor_total, data_emissao)
VALUES ('aguardando_revisao', 'email', 'test/dummy.xml', 'xml', 'Fornecedor Teste', '12345678000199', '99999', 1500.00, '2026-03-25');
```

---

## Teste 7: Realtime (se possivel)

| # | Acao | Resultado Esperado |
|---|---|---|
| 7.1 | Abrir pagina NF-e em uma aba | Tabela carregada |
| 7.2 | Em outra aba/terminal, inserir registro na nfe_inbox via SQL ou API | — |
| 7.3 | Voltar para a aba da pagina NF-e | Novo item aparece SEM refresh (realtime) |

---

## Resumo — O que testar vs. O que esperar

| Funcionalidade | Testavel agora? | Esperado |
|---|---|---|
| Navegacao (6 tabs financeiro + 4 tabs NF-e) | Sim | Tudo carrega |
| Insercao manual (formulario) | Sim | Cria lancamento + fornecedor |
| Upload manual (drag-and-drop) | Sim | Salva no storage + insere nfe_inbox |
| Historico | Sim | Lista registros |
| Dialog de revisao (abrir/visualizar) | Sim | Abre, mostra dados |
| Rejeitar NF-e | Sim | Funciona |
| Aprovar NF-e | Nao (precisa deploy) | Erro esperado |
| Auto-parse XML | Nao (precisa deploy) | Fica como "recebido" |
| IMAP fetch | Nao (precisa deploy + secrets) | Nao executa |
| Badge pendentes | Parcial | Funciona com dados manuais na tabela |
