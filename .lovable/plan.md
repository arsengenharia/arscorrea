

# Plano: Adicionar Fornecedores ao Menu Superior e ao Formulario de Custos

## Resumo

Duas correções para tornar o módulo de fornecedores funcional:
1. Adicionar "Fornecedores" ao menu de navegação superior (TopNavigation)
2. Integrar o campo de fornecedor no formulário de custos de obra

## 1. Menu Superior (TopNavigation.tsx)

Adicionar o item "Fornecedores" com ícone `Truck` ao array `menuItems`, mantendo consistência com o `AppSidebar.tsx`.

**Arquivo**: `src/components/layout/TopNavigation.tsx`
- Importar `Truck` do lucide-react
- Adicionar `{ title: "Fornecedores", icon: Truck, path: "/fornecedores" }` ao array de itens

## 2. Campo Fornecedor no Formulario de Custos (ProjectCosts.tsx)

Adicionar um select de fornecedor no dialog de "Novo Custo", buscando da tabela `suppliers` e salvando o `supplier_id` no registro de `project_costs`.

**Arquivo**: `src/pages/ProjectCosts.tsx`
- Buscar lista de fornecedores com `useQuery` (tabela `suppliers`)
- Adicionar `supplier_id` ao estado do formulário
- Adicionar um `Select` com os fornecedores no dialog
- Incluir `supplier_id` no insert da mutation
- Exibir o nome do fornecedor na coluna da tabela de custos (join ou lookup local)

## Arquivos Modificados

1. `src/components/layout/TopNavigation.tsx` -- item de menu
2. `src/pages/ProjectCosts.tsx` -- campo supplier_id no form e na tabela

## Sequencia

1. Atualizar TopNavigation com o item Fornecedores
2. Integrar select de fornecedor no formulário e listagem de custos

