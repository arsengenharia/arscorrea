
# Plano: Aprimorar Lista de Propostas com Classificacao Comercial

## Visao Geral

Este plano adiciona um sistema de classificacao comercial (funil de vendas) para as propostas, removendo a coluna redundante "Condominio" e melhorando a exibicao dos dados do cliente.

---

## 1. Alteracoes no Banco de Dados

### 1.1 Criar tabela `proposal_stages` (Etapas do Funil)

```sql
CREATE TABLE public.proposal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir valores iniciais
INSERT INTO public.proposal_stages (name, order_index) VALUES
  ('Em aberto', 1),
  ('Fachada', 2),
  ('Em analise', 3),
  ('Perdida', 4);
```

### 1.2 Adicionar coluna `stage_id` na tabela `proposals`

```sql
ALTER TABLE public.proposals 
ADD COLUMN stage_id uuid REFERENCES public.proposal_stages(id);

-- Definir valor padrao para propostas existentes e novas
UPDATE public.proposals 
SET stage_id = (SELECT id FROM public.proposal_stages WHERE name = 'Em aberto')
WHERE stage_id IS NULL;
```

### 1.3 Configurar RLS (Row Level Security)

```sql
ALTER TABLE public.proposal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view proposal stages"
ON public.proposal_stages FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage proposal stages"
ON public.proposal_stages FOR ALL
USING (auth.role() = 'authenticated');
```

---

## 2. Alteracoes na Interface

### 2.1 Atualizar `ProposalsList.tsx`

**Remover:**
- Coluna "Condominio" (linha 135 e 156)

**Alterar coluna "Cliente":**
- Exibir nome do cliente em destaque
- Exibir documento (CPF/CNPJ) em texto menor abaixo

**Adicionar nova coluna "Situacao":**
- Exibir badge colorido com o nome da etapa
- Incluir dropdown para alteracao rapida da situacao

**Atualizar query:**
```typescript
.select(`
  *, 
  client:clients(id, name, document),
  stage:proposal_stages(id, name)
`)
```

### 2.2 Criar componente `ProposalStageBadge.tsx`

Novo componente para exibir a etapa comercial com cores distintas:
- Em aberto: Azul claro
- Fachada: Verde
- Em analise: Amarelo/Laranja
- Perdida: Vermelho

### 2.3 Criar componente `ProposalStageSelect.tsx`

Dropdown inline para alteracao rapida da situacao:
- Carrega opcoes da tabela `proposal_stages`
- Atualiza imediatamente ao selecionar
- Exibe toast de confirmacao

---

## 3. Estrutura de Arquivos

```text
src/components/proposals/
  ProposalsList.tsx          (modificar)
  ProposalStageBadge.tsx     (criar)
  ProposalStageSelect.tsx    (criar)
```

---

## 4. Detalhes Tecnicos

### 4.1 Tipo TypeScript atualizado

```typescript
type ProposalWithClientAndStage = {
  id: string;
  number: string | null;
  title: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
  pdf_path: string | null;
  stage_id: string | null;
  client: {
    id: string;
    name: string;
    document: string | null;
  } | null;
  stage: {
    id: string;
    name: string;
  } | null;
};
```

### 4.2 Mutation para alterar situacao

```typescript
const updateStageMutation = useMutation({
  mutationFn: async ({ proposalId, stageId }: { proposalId: string; stageId: string }) => {
    const { error } = await supabase
      .from("proposals")
      .update({ stage_id: stageId })
      .eq("id", proposalId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    toast.success("Situacao atualizada");
  },
});
```

---

## 5. Resultado Visual

### Tabela Atualizada

| Numero / Titulo | Cliente | Situacao | Status | Total | Data | Acoes |
|-----------------|---------|----------|--------|-------|------|-------|
| PROP-2026-0001 | Cond. Aurora (12.345.678/0001-90) | [Em aberto] | Rascunho | R$ 50.000 | 08/02/2026 | ... |

### Cores dos Badges de Situacao

- **Em aberto**: Fundo azul claro, texto azul escuro
- **Fachada**: Fundo verde claro, texto verde escuro
- **Em analise**: Fundo amarelo claro, texto amarelo escuro
- **Perdida**: Fundo vermelho claro, texto vermelho escuro

---

## 6. Preparacao para Dashboard

A nova estrutura permite consultas como:

```sql
SELECT ps.name, COUNT(p.id) as total
FROM proposals p
JOIN proposal_stages ps ON p.stage_id = ps.id
GROUP BY ps.name
ORDER BY ps.order_index;
```

Isso fornece dados para graficos de funil comercial no dashboard futuro.

---

## 7. Impacto

- **Nenhuma alteracao** em: formulario de proposta, PDF, relatorios existentes
- **Compatibilidade**: Propostas existentes receberao automaticamente a situacao "Em aberto"
- **Escalabilidade**: Novas situacoes podem ser adicionadas via banco de dados
