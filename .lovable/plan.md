
# Plano: Centralizar Mapa em Belo Horizonte

## Objetivo
Configurar o mapa para iniciar sempre centralizado em Belo Horizonte com um zoom adequado para visualização da cidade, eliminando a necessidade do usuário ajustar manualmente.

---

## Alteração Proposta

### Arquivo: `src/components/dashboard/ProposalsMap.tsx`

**Mudanças:**

1. Substituir as coordenadas de `BRAZIL_CENTER` pelas coordenadas de Belo Horizonte:
   - Atual: `{ lat: -14.235, lng: -51.9253 }` (centro do Brasil)
   - Nova: `{ lat: -19.9167, lng: -43.9345 }` (Belo Horizonte)

2. Alterar a lógica de centralização do mapa:
   - Atual: Calcula a média das coordenadas das propostas
   - Nova: Sempre usar Belo Horizonte como centro fixo

3. Definir zoom fixo adequado para a cidade:
   - Atual: Zoom 10 (quando há propostas) ou 4 (sem propostas)
   - Novo: Zoom 12 (ideal para visualizar a região metropolitana de BH)

---

## Código Antes e Depois

**Antes (linhas 10-11):**
```typescript
// Brazil center coordinates
const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };
```

**Depois:**
```typescript
// Belo Horizonte center coordinates
const BELO_HORIZONTE_CENTER = { lat: -19.9167, lng: -43.9345 };
const DEFAULT_ZOOM = 12;
```

**Antes (linhas 51-58):**
```typescript
const center = useMemo(() => {
  if (proposalsWithCoords.length === 0) return BRAZIL_CENTER;
  
  const avgLat = proposalsWithCoords.reduce((sum, p) => sum + (p.lat || 0), 0) / proposalsWithCoords.length;
  const avgLng = proposalsWithCoords.reduce((sum, p) => sum + (p.lng || 0), 0) / proposalsWithCoords.length;
  
  return { lat: avgLat, lng: avgLng };
}, [proposalsWithCoords]);
```

**Depois:**
```typescript
// Sempre centralizar em Belo Horizonte
const center = BELO_HORIZONTE_CENTER;
```

**Antes (linhas 61-63):**
```typescript
<Map
  defaultCenter={center}
  defaultZoom={proposalsWithCoords.length > 0 ? 10 : 4}
```

**Depois:**
```typescript
<Map
  defaultCenter={center}
  defaultZoom={DEFAULT_ZOOM}
```

---

## Resultado Esperado

1. O mapa abre automaticamente centralizado em Belo Horizonte
2. Zoom nível 12 mostra a cidade e região metropolitana
3. Usuário não precisa ajustar zoom/posição manualmente
4. Todos os pins de propostas na região de BH ficam visíveis imediatamente
