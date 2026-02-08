-- Update the stage name from "Fachada" to "Fechada"
UPDATE public.proposal_stages 
SET name = 'Fechada' 
WHERE name = 'Fachada';