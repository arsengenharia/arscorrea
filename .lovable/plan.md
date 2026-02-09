
# Plano: Corrigir Exclusão de Propostas e Melhorar Tratamento de Erros

## Resumo do Problema

Ao tentar excluir uma proposta que possui contrato vinculado, o sistema retorna erro 409 (foreign key constraint) sem explicar claramente o motivo ao usuário.

## Solução Proposta

Implementar tratamento adequado de erros de FK em todas as telas de listagem, seguindo o padrão já existente em `ClientsList`.

---

## Alterações por Arquivo

### 1. ProposalsList.tsx
**Objetivo:** Tratar erro de FK e informar usuário sobre vínculos

**Mudanças:**
- Modificar `onError` da `deleteMutation` para detectar erro de FK
- Verificar se o erro menciona `contracts` ou `proposal_imports`
- Exibir mensagem específica: "Esta proposta não pode ser excluída pois possui um contrato vinculado"
- Para `proposal_imports`, excluir automaticamente antes da proposta (são apenas logs de importação)

```typescript
// Antes
onError: () => {
  toast.error("Erro ao excluir proposta");
}

// Depois  
onError: (error: any) => {
  const msg = error?.message || "";
  if (msg.includes("contracts_proposal_id_fkey")) {
    toast.error("Esta proposta possui um contrato vinculado. Exclua o contrato primeiro.");
  } else if (msg.includes("proposal_imports_proposal_id_fkey")) {
    toast.error("Erro ao excluir proposta. Tente novamente.");
  } else {
    toast.error("Erro ao excluir proposta");
  }
}
```

**Adicionar limpeza de proposal_imports antes da exclusão:**
```typescript
mutationFn: async (proposalId: string) => {
  // Limpar imports órfãos
  await supabase
    .from("proposal_imports")
    .delete()
    .eq("proposal_id", proposalId);
    
  // Agora excluir a proposta
  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId);
  if (error) throw error;
}
```

---

### 2. ContractsList.tsx  
**Objetivo:** Melhorar mensagem de erro

**Mudanças:**
- Atualizar `onError` para mostrar detalhes do erro
- Contratos já têm CASCADE em todas as FKs, então deve funcionar, mas adicionar log para debug

```typescript
onError: (error: any) => {
  console.error("Erro ao excluir contrato:", error);
  toast.error("Erro ao excluir contrato: " + (error?.message || "Erro desconhecido"));
}
```

---

### 3. (Opcional) Migração SQL para CASCADE
**Objetivo:** Configurar cascade automático nas FKs problemáticas

Se desejar que excluir uma proposta automaticamente exclua contratos vinculados:

```sql
-- Alterar contracts.proposal_id para CASCADE
ALTER TABLE contracts
  DROP CONSTRAINT contracts_proposal_id_fkey;
  
ALTER TABLE contracts
  ADD CONSTRAINT contracts_proposal_id_fkey
  FOREIGN KEY (proposal_id) 
  REFERENCES proposals(id) 
  ON DELETE CASCADE;
```

> **Nota:** Isso é destrutivo - excluir proposta = excluir contrato. Pode não ser o comportamento desejado.

---

## Recomendação

Implementar tratamento de erro no código (opções 1 e 2) em vez de CASCADE no banco, pois:
- É mais seguro (evita exclusões acidentais em cascata)
- Dá controle ao usuário sobre o que excluir
- Segue o padrão já usado em `ClientsList`

---

## Arquivos a Modificar
1. `src/components/proposals/ProposalsList.tsx`
2. `src/components/contracts/ContractsList.tsx`

---

## Teste de Validação
1. Tentar excluir proposta SEM contrato → deve excluir
2. Tentar excluir proposta COM contrato → deve mostrar mensagem clara
3. Tentar excluir contrato → deve funcionar (já tem CASCADE)
4. Tentar excluir projeto → deve funcionar (já funciona)
5. Tentar excluir cliente com proposta → deve mostrar mensagem clara
