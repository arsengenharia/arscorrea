
# Plano: Mapa de Propostas no Dashboard Comercial

## Objetivo
Adicionar um mapa interativo do Google Maps na aba Comercial do Dashboard, exibindo pins coloridos por status da proposta. Ao passar o mouse sobre um pin, um tooltip mostrara um resumo com os principais dados da proposta.

---

## Dados Disponiveis

### Tabela `proposals` - Campos de localizacao:
- `work_address`: Endereco da obra (texto livre)
- `city`: Cidade da obra
- `state`: Estado da obra
- `condo_name`: Nome do condominio

### Fallback para `clients`:
- `street`, `number`, `city`, `state` (quando proposta nao tem endereco)

### Stages de propostas (cores):
| Stage | Cor sugerida |
|-------|--------------|
| Em aberto | Azul (#3B82F6) |
| Em analise | Amarelo (#F59E0B) |
| Fechada | Verde (#22C55E) |
| Perdida | Vermelho (#EF4444) |

---

## Arquitetura da Solucao

### 1. Geocodificacao
Para plotar pins no mapa, precisamos converter enderecos em coordenadas (lat/lng). Opcoes:

**Opcao A - Google Geocoding API (Recomendada)**
- Usar a API Key ja existente no projeto: `AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck`
- Geocodificar enderecos no carregamento do mapa
- Cache local para evitar chamadas duplicadas

**Opcao B - Geocodificacao previa no banco**
- Adicionar colunas `lat` e `lng` na tabela `proposals`
- Geocodificar ao salvar/atualizar proposta
- Mais performatico, porem requer migracao

**Decisao**: Opcao A para implementacao inicial (mais rapida), com cache no navegador.

### 2. Biblioteca de Mapa
Sera necessario instalar uma biblioteca React para o Google Maps:

```
@vis.gl/react-google-maps
```

Esta e a biblioteca oficial do Google para React, moderna e bem mantida.

---

## Alteracoes Propostas

### 1. Instalar Dependencia
```
npm install @vis.gl/react-google-maps
```

### 2. Atualizar Hook de Metricas
**Arquivo:** `src/hooks/use-dashboard-metrics.ts`

Expandir a query de propostas para incluir dados de localizacao:
```typescript
const { data, error } = await supabase
  .from("proposals")
  .select(`
    id,
    number,
    total,
    created_at,
    stage_id,
    work_address,
    city,
    state,
    condo_name,
    proposal_stages (name),
    clients (name, street, number, city, state)
  `);
```

Adicionar funcao para preparar dados do mapa:
```typescript
const getProposalsForMap = () => {
  if (!proposalsData) return [];
  
  return proposalsData.map(p => ({
    id: p.id,
    number: p.number,
    clientName: p.clients?.name,
    stageName: p.proposal_stages?.name,
    total: p.total,
    // Prioriza endereco da obra, fallback para cliente
    address: buildAddress(p),
  }));
};
```

### 3. Criar Componente de Mapa
**Novo arquivo:** `src/components/dashboard/ProposalsMap.tsx`

Estrutura do componente:
- Container com altura fixa (400px)
- Mapa centralizado no Brasil (ou na regiao com mais propostas)
- Marcadores com cores por status
- InfoWindow com sumario ao hover

```text
+--------------------------------------------------+
|                   MAPA                           |
|                                                  |
|    [Pin Azul]     [Pin Verde]                    |
|                                                  |
|         [Pin Amarelo]                            |
|                     +------------------+         |
|                     | PROP-2026-0001   |         |
|                     | Cliente: Aimores |         |
|                     | Valor: R$ 500k   |         |
|                     | Status: Em aberto|         |
|                     +------------------+         |
|                                                  |
|    [Pin Vermelho]                                |
|                                                  |
+--------------------------------------------------+
```

### 4. Criar Hook de Geocodificacao
**Novo arquivo:** `src/hooks/use-geocoding.ts`

- Cache de coordenadas no localStorage
- Throttle de chamadas para API
- Fallback para cidade/estado se endereco falhar

### 5. Atualizar Pagina Index
**Arquivo:** `src/pages/Index.tsx`

Adicionar o mapa na aba Comercial, apos os charts:

```tsx
{/* Charts Row */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <ProposalsFunnel ... />
  <ProposalsAgingChart ... />
</div>

{/* Mapa de Propostas */}
<ProposalsMap 
  data={proposalsForMap} 
  isLoading={isLoading} 
/>

{/* Table */}
<OldestProposalsTable ... />
```

---

## Componente ProposalsMap - Detalhes

### Props
```typescript
interface ProposalsMapProps {
  data: Array<{
    id: string;
    number: string;
    clientName: string;
    stageName: string;
    total: number;
    address: string;
  }>;
  isLoading: boolean;
}
```

### Tooltip (InfoWindow) - Dados exibidos:
- Numero da proposta
- Nome do cliente
- Valor total (formatado em R$)
- Status/Etapa (com cor correspondente)
- Endereco resumido

### Legenda de Cores
Incluir legenda visual abaixo ou ao lado do mapa:
```text
● Em aberto  ● Em analise  ● Fechada  ● Perdida
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `package.json` | Adicionar `@vis.gl/react-google-maps` |
| `src/hooks/use-geocoding.ts` | **Criar** - Hook para geocodificacao com cache |
| `src/hooks/use-dashboard-metrics.ts` | Expandir query e adicionar `proposalsForMap` |
| `src/components/dashboard/ProposalsMap.tsx` | **Criar** - Componente do mapa |
| `src/pages/Index.tsx` | Integrar ProposalsMap na aba Comercial |

---

## Fluxo de Funcionamento

```text
1. Dashboard carrega
       |
       v
2. Hook busca propostas com enderecos
       |
       v
3. ProposalsMap recebe lista de propostas
       |
       v
4. Hook useGeocoding converte enderecos -> coordenadas
       |
       v
5. Mapa renderiza com marcadores coloridos
       |
       v
6. Usuario passa mouse -> InfoWindow com sumario
```

---

## Consideracoes Tecnicas

### Performance
- Geocodificacao e feita progressivamente (nao bloqueia render)
- Cache de coordenadas no localStorage evita chamadas repetidas
- Limite de 10 geocodificacoes por segundo (evita rate limit)

### Tratamento de Enderecos Invalidos
- Propostas sem endereco valido nao aparecem no mapa
- Exibir contador: "X de Y propostas mapeadas"

### API Key
A API Key do Google Maps ja existe no projeto:
`AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck`

E uma chave publica (publishable), portanto pode ser usada no frontend.

---

## Resultado Esperado

1. Mapa interativo exibido na aba Comercial do Dashboard
2. Pins coloridos por status da proposta
3. Tooltip com sumario ao passar o mouse
4. Legenda de cores para identificacao rapida
5. Propostas sem endereco nao quebram o mapa

