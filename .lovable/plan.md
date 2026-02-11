

# Etapa 5 - Documentos Compartilhados: Gestao Admin + Portal

## Resumo

Criar uma secao administrativa para upload e gerenciamento de documentos na pagina de detalhes da obra (`/obras/{id}`), logo abaixo da secao de Ocorrencias. Os mesmos documentos aparecerao automaticamente na aba "Documentos" do portal do cliente que ja existe.

## Alteracoes Necessarias

### 1. Migration: Adicionar campo `description` na tabela `project_documents`

A tabela atual nao possui campo de descricao/observacoes. Sera adicionada uma coluna `description` (text, nullable) para armazenar as observacoes do documento.

```sql
ALTER TABLE project_documents ADD COLUMN description text;
```

### 2. Novo componente: `ProjectDocumentsAdmin.tsx`

Criar `src/components/projects/ProjectDocumentsAdmin.tsx` com:

- **Formulario de upload** (dialog ou inline):
  - Campo "Nome do Documento" (texto obrigatorio)
  - Campo "Observacoes" (textarea opcional)
  - Seletor de arquivo (input file)
  - Botao "Enviar" que faz upload para o bucket `project_documents` e insere o registro na tabela

- **Lista de documentos** exibindo:
  - Icone por tipo de arquivo (PDF, imagem, etc.)
  - Nome do documento
  - Data de insercao (formatada pt-BR)
  - Observacoes/descricao
  - Acoes: Visualizar (abre em nova janela via signed URL), Download, Deletar (com confirmacao)

- Segue o mesmo padrao visual do `PortalEventsAdmin` (Cards com acoes)

### 3. Integrar na pagina ProjectDetails.tsx

Adicionar a secao "Documentos Compartilhados" logo abaixo da secao "Ocorrencias do Portal", com o mesmo estilo visual (icone colorido + titulo + card branco).

### 4. Atualizar PortalDocumentsList.tsx (portal do cliente)

Adicionar a exibicao do campo `description` (observacoes) na lista de documentos do portal, mantendo o layout existente.

## Detalhes Tecnicos

- Upload de arquivo vai para o bucket `project_documents` (ja existe, privado)
- O `file_type` sera extraido da extensao do arquivo
- Visualizacao usa `getSignedUrl` para gerar URL temporaria
- Delete remove o registro da tabela E o arquivo do storage
- RLS ja esta configurado: admins podem inserir/deletar, clientes do portal podem visualizar
- Query key `["project-documents", projectId]` para invalidacao apos operacoes

## Arquivos Afetados

| Arquivo | Acao |
|---|---|
| Migration SQL | Adicionar coluna `description` |
| `src/components/projects/ProjectDocumentsAdmin.tsx` | Criar (novo) |
| `src/pages/ProjectDetails.tsx` | Editar - adicionar secao de documentos |
| `src/components/portal/PortalDocumentsList.tsx` | Editar - exibir observacoes |

