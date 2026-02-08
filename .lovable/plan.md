
# Plano: Melhorias na Aba Comercial do Dashboard

## Objetivo
Adicionar indicadores comerciais (KPIs) na aba Comercial do Dashboard, exibir volume de propostas em aberto por periodo com seus respectivos status, e reorganizar as abas para que "Comercial" fique a esquerda e "Financeiro" a direita.

---

## Alteracoes Propostas

### 1. Reorganizar Ordem das Abas
**Arquivo:** `src/pages/Index.tsx`

Alteracoes:
- Mudar `defaultValue="financial"` para `defaultValue="commercial"`
- Reordenar os TabsTrigger: Comercial primeiro (esquerda), Financeiro segundo (direita)
- Reordenar os TabsContent correspondentes

### 2. Criar Componente de KPIs Comerciais
**Novo arquivo:** `src/components/dashboard/CommercialKPIs.tsx`

Cards de indicadores:
- **Propostas em Aberto**: Total de propostas com status diferente de "Fechada" e "Perdida"
- **Propostas no Periodo**: Quantidade de propostas criadas no periodo filtrado
- **Valor Total em Aberto**: Soma do valor (`total`) das propostas em aberto
- **Taxa de Conversao**: Porcentagem de Fechadas / (Fechadas + Perdidas)
- **Ticket Medio**: Valor medio das propostas fechadas

### 3. Atualizar Hook de Metricas
**Arquivo:** `src/hooks/use-dashboard-metrics.ts`

Novas metricas a calcular:
- `proposalsEmAberto`: Contagem de propostas nao fechadas/perdidas
- `proposalsNoPeriodo`: Propostas criadas dentro do periodo filtrado
- `valorTotalEmAberto`: Soma dos valores das propostas em aberto
- `taxaConversao`: Fechadas / (Fechadas + Perdidas) * 100
- `ticketMedio`: Soma valores fechadas / quantidade fechadas
- `proposalsByStageInPeriod`: Distribuicao por status considerando o filtro de periodo

### 4. Atualizar Pagina Index
**Arquivo:** `src/pages/Index.tsx`

- Importar novo componente `CommercialKPIs`
- Adicionar KPIs comerciais no topo da aba Comercial
- Atualizar props do hook para incluir novas metricas

---

## Estrutura Visual da Aba Comercial (apos mudancas)

```text
+--------------------------------------------------+
|  [Comercial]    [Financeiro]                     |
+--------------------------------------------------+
|                                                  |
|  +----------+ +----------+ +----------+          |
|  | Propostas| | Propostas| | Valor em |          |
|  | em Aberto| | no Periodo| | Aberto  |          |
|  |    12    | |     5    | | R$ 450k |          |
|  +----------+ +----------+ +----------+          |
|                                                  |
|  +----------+ +----------+                       |
|  | Taxa de  | | Ticket   |                       |
|  | Conversao| |  Medio   |                       |
|  |   65%    | | R$ 75k   |                       |
|  +----------+ +----------+                       |
|                                                  |
|  +------------------------+ +------------------+ |
|  |   Funil de Propostas   | | Aging Propostas  | |
|  |      (Pie Chart)       | |  (Stacked Bar)   | |
|  +------------------------+ +------------------+ |
|                                                  |
|  +----------------------------------------------+|
|  |     Propostas Mais Antigas em Aberto         ||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

---

## Detalhes Tecnicos

### Logica dos KPIs Comerciais

```text
proposalsEmAberto:
  COUNT(proposals) WHERE stage != 'Fechada' AND stage != 'Perdida'

proposalsNoPeriodo:
  COUNT(proposals) WHERE created_at >= start AND created_at <= end

valorTotalEmAberto:
  SUM(proposals.total) WHERE stage != 'Fechada' AND stage != 'Perdida'

taxaConversao:
  (Fechadas / (Fechadas + Perdidas)) * 100
  Se total = 0, retorna 0

ticketMedio:
  SUM(total das fechadas) / COUNT(fechadas)
  Se count = 0, retorna 0
```

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Index.tsx` | Reordenar tabs, adicionar CommercialKPIs |
| `src/hooks/use-dashboard-metrics.ts` | Adicionar calculo de metricas comerciais |
| `src/components/dashboard/CommercialKPIs.tsx` | **Criar** - KPIs comerciais |

---

## Resultado Esperado

1. Ao acessar o Dashboard, a aba "Comercial" estara ativa por padrao
2. A aba "Comercial" tera 5 KPIs no topo com informacoes relevantes
3. Os graficos e tabela existentes permanecem abaixo dos KPIs
4. Os filtros de periodo afetam todas as metricas comerciais
5. A aba "Financeiro" continua funcionando normalmente, porem a direita
