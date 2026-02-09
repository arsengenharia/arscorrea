-- Adicionar policy de DELETE para proposal_imports (faltava)
CREATE POLICY "Users can delete their own imports"
ON public.proposal_imports
FOR DELETE
USING (auth.uid() = created_by);