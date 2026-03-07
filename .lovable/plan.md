

# Correcao Completa dos Selects com Tela em Branco

## Problema Real

A correcao anterior foi incompleta. Tres arquivos adicionais ainda possuem padroes que causam tela em branca:

1. **`EditClientDialog.tsx`** — Usa `<FormControl>` envolvendo `<SelectTrigger>` (conflito de Slot do Radix UI) nos selects de Tipo de Cliente e Segmento
2. **`ClientForm.tsx`** — Usa `value={field.value || ""}` nos 4 selects (Tipo de Cliente, Segmento, Responsavel, Canal do Lead). String vazia `""` nao e um valor valido para Radix Select
3. **`ProjectStatusSelect.tsx`** — Usa `defaultValue` em vez de `value` (componente nao-controlado)

## Solucao

### 1. `src/components/clients/EditClientDialog.tsx`
- Linhas 179-183: Remover `<FormControl>` do select Tipo de Cliente
- Linhas 204-208: Remover `<FormControl>` do select Segmento

Antes:
```tsx
<Select onValueChange={field.onChange} value={field.value || undefined}>
  <FormControl>
    <SelectTrigger>
      <SelectValue placeholder="..." />
    </SelectTrigger>
  </FormControl>
```

Depois:
```tsx
<Select onValueChange={field.onChange} value={field.value || undefined}>
  <SelectTrigger>
    <SelectValue placeholder="..." />
  </SelectTrigger>
```

### 2. `src/components/clients/ClientForm.tsx`
- Linhas 306, 329, 512, 553: Trocar `value={field.value || ""}` por `value={field.value || undefined}`

String vazia causa crash no Radix Select. Usar `undefined` permite que o placeholder funcione corretamente.

### 3. `src/components/projects/ProjectStatusSelect.tsx`
- Linha 37: Trocar `defaultValue={status}` por `value={status}`

Componente controlado garante que mudancas no prop `status` sejam refletidas.

## Resumo de Mudancas

| Arquivo | Problema | Correcao |
|---|---|---|
| EditClientDialog.tsx | FormControl + SelectTrigger | Remover FormControl |
| ClientForm.tsx | `value=""` (string vazia) | Usar `undefined` |
| ProjectStatusSelect.tsx | `defaultValue` | Usar `value` |

