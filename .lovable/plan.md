
# Simplificar Navegacao: Remover Paginas Intermediarias de Obras e Clientes

## Problema Atual
As paginas `/obras` e `/clientes` mostram apenas dois botoes (novo + lista), o que e redundante porque as proprias paginas de lista ja possuem botao "Nova Obra" / "Novo Cliente".

## Solucao
Fazer com que `/obras` e `/clientes` carreguem diretamente as listas, eliminando a etapa intermediaria.

## Alteracoes

### 1. `src/pages/Projects.tsx` - Simplificar para mostrar lista diretamente
- Remover a logica de `tab` (query param) e o menu intermediario
- A rota `/obras` renderiza diretamente a `ProjectsList` dentro do `Layout`
- Manter suporte ao query param `status` para filtros vindos do dashboard (usando `localStorage`)

### 2. `src/pages/Clients.tsx` - Simplificar para mostrar lista diretamente
- Remover o menu intermediario com dois botoes
- A rota `/clientes` renderiza diretamente o conteudo da `ClientsList`
- Remover a logica de `showList` redirect

### 3. `src/components/projects/ProjectsList.tsx` - Ajustar navegacao
- Remover o botao "Voltar" (nao ha mais pagina intermediaria)
- Alterar os links "Nova Obra" de `/obras?tab=new` para `/obras/nova` (nova rota dedicada)
- Manter o botao "Nova Obra" existente no header

### 4. `src/components/clients/ClientsList.tsx` - Ajustar navegacao
- Remover o botao "Voltar" que aponta para `/clientes`
- A pagina ja possui botao "Novo Cliente" apontando para `/clientes/cadastro`

### 5. `src/App.tsx` - Ajustar rotas
- `/clientes` renderiza `ClientsList` diretamente (com Layout)
- Remover rota `/clientes/lista` (redundante, redirecionar se necessario)
- `/obras` renderiza `ProjectsList` (com Layout)
- Criar rota `/obras/nova` para o formulario de nova obra
- Remover `ProjectsContent.tsx` (nao sera mais necessario)

### 6. Atualizar referencias em outros arquivos
- `src/pages/ProjectDetails.tsx`: trocar `/obras?tab=list` por `/obras`
- `src/components/projects/ProjectForm.tsx`: trocar `/obras?tab=list` por `/obras`
- `src/components/layout/TopNavigation.tsx` e `AppSidebar.tsx`: ja apontam para `/clientes` e `/obras` (sem mudanca necessaria)
- `src/pages/ClientDetails.tsx`: trocar `/clientes/lista` por `/clientes`
- `src/components/clients/ClientForm.tsx`: trocar `/clientes/lista` por `/clientes`
- `src/components/proposals/ProposalClientSection.tsx`: ja aponta para `/clientes/cadastro` (sem mudanca)
- Dashboard links que usam `showList=true` ou `status` params: ajustar para apontar diretamente para `/clientes` e `/obras?status=X`

### 7. Arquivos a remover
- `src/components/projects/ProjectsContent.tsx` (componente intermediario obsoleto)

## Resumo dos Impactos nas Rotas

| Antes | Depois |
|---|---|
| `/obras` (menu) | `/obras` (lista direta) |
| `/obras?tab=list` | `/obras` |
| `/obras?tab=new` | `/obras/nova` |
| `/clientes` (menu) | `/clientes` (lista direta) |
| `/clientes/lista` | `/clientes` |
| `/clientes/cadastro` | `/clientes/cadastro` (sem mudanca) |
