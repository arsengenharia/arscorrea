
# Plano: Checkbox "Nao informado" para CPF/CNPJ

## Resumo
Adicionar um checkbox "Nao informado" ao lado do campo CPF/CNPJ nos dois formularios de cliente (cadastro e edicao). Quando marcado, o campo fica desabilitado e a validacao obrigatoria e removida.

## Alteracoes por Arquivo

### 1. `src/components/clients/ClientForm.tsx`

**Schema Zod (linha 47):**
- Alterar validacao de `document` para aceitar string vazia:
  - De: `z.string().min(11, "...")`
  - Para: `z.string().optional().or(z.literal(""))`

**Estado:**
- Adicionar estado `documentNotProvided` com `useState(false)`

**UI do campo document (linhas 236-248):**
- Adicionar checkbox com label "Nao informado" ao lado do label do campo
- Quando marcado: desabilitar o input, limpar o valor do campo
- Quando desmarcado: reabilitar o input

### 2. `src/components/clients/EditClientDialog.tsx`

**Schema Zod (linha 23):**
- Mesma alteracao: tornar `document` opcional

**Estado:**
- Adicionar estado `documentNotProvided`, inicializado como `true` se `client.document` for null/vazio

**UI do campo document (linhas 109-121):**
- Mesma logica de checkbox do formulario de cadastro

---

## Detalhes Tecnicos

Ambos os arquivos seguirao o mesmo padrao:

```typescript
// Estado
const [documentNotProvided, setDocumentNotProvided] = useState(false);

// Ao marcar checkbox
const handleDocumentNotProvided = (checked: boolean) => {
  setDocumentNotProvided(checked);
  if (checked) {
    form.setValue("document", "");
    form.clearErrors("document");
  }
};

// No JSX - checkbox inline com o label
<div className="flex items-center justify-between">
  <FormLabel>CPF/CNPJ</FormLabel>
  <label className="flex items-center gap-2 text-sm">
    <Checkbox checked={documentNotProvided} onCheckedChange={handleDocumentNotProvided} />
    Nao informado
  </label>
</div>
<Input disabled={documentNotProvided} ... />
```

## Arquivos a Modificar
1. `src/components/clients/ClientForm.tsx`
2. `src/components/clients/EditClientDialog.tsx`
