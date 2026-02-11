

# Limpar Icones Redundantes e Adicionar Atalho para Documentos

## Problema
Na tabela de obras existem icones de upload duplicados:
- **Desktop**: Um icone de upload ao lado do nome E uma coluna inteira "Anexar Arquivos" — redundante.
- **Mobile**: Um icone de upload no titulo E outro na area de acoes — tambem redundante.

## Solucao

### 1. `ProjectsTable.tsx` — Remover redundancias
- **Desktop**: Remover o icone de upload ao lado do nome (linhas 127-137) e remover a coluna "Anexar Arquivos" inteira (header linha 114-116 e cell linhas 151-159).
- **Mobile**: Remover o icone de upload do titulo (linhas 41-51) e o da area de acoes (linhas 74-84).
- A tabela fica mais limpa, apenas com: Nome, Status, Data de Inicio, Ultima Atualizacao e Acoes.

### 2. `ProjectActions.tsx` — Adicionar icone de Documentos
- Adicionar um novo botao com icone `FolderOpen` (pasta de documento) entre os botoes existentes.
- Ao clicar, navega para `/obras/{projectId}` com um hash ou query param que direcione para a secao de documentos (ex: `/obras/{projectId}?tab=documentos` ou scroll automatico).
- Tooltip: "Documentos da Obra".

## Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `src/components/projects/ProjectsTable.tsx` | Remover icones de upload redundantes e coluna "Anexar Arquivos" |
| `src/components/projects/ProjectActions.tsx` | Adicionar botao com icone de pasta que linka para documentos |

