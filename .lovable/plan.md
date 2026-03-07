

# Correcao de Tela em Branco nos Selects dos Formularios

## Problema

Tres formularios usam `<FormControl>` envolvendo `<SelectTrigger>` e `defaultValue` no `<Select>`. Isso causa conflito de Slot do Radix UI, resultando em tela branca ao interagir com os selects. Este e um problema ja documentado no projeto.

## Solucao

Para cada ocorrencia, aplicar duas mudancas:
1. Trocar `defaultValue` por `value` (componente controlado)
2. Remover o wrapper `<FormControl>` do `<SelectTrigger>`

## Arquivos Afetados

| Arquivo | Select(s) |
|---|---|
| `src/pages/StageForm.tsx` | Status (linha 174) |
| `src/pages/EditStageForm.tsx` | Status (linha 218) |
| `src/components/projects/ProjectForm.tsx` | Cliente (linha 119) e Status (linha 144) |

## Exemplo da Mudanca

Antes:
```tsx
<Select onValueChange={field.onChange} defaultValue={field.value}>
  <FormControl>
    <SelectTrigger>
      <SelectValue placeholder="..." />
    </SelectTrigger>
  </FormControl>
```

Depois:
```tsx
<Select onValueChange={field.onChange} value={field.value}>
  <SelectTrigger>
    <SelectValue placeholder="..." />
  </SelectTrigger>
```

