ALTER TABLE financial_categories ADD COLUMN IF NOT EXISTS codigo text UNIQUE;

UPDATE financial_categories SET codigo = 'mao_obra_direta'       WHERE nome = 'Mão de Obra Direta'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'materiais_obra'        WHERE nome = 'Materiais de Obra'        AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'servicos_prestados'    WHERE nome = 'Serviços Prestados'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'equipamentos'          WHERE nome = 'Equipamentos e Ferramentas' AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'reembolsos_despesas'   WHERE nome ILIKE '%Reembolsos%'          AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'aporte_clientes'       WHERE nome = 'Aporte de Clientes'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'servicos_receita'      WHERE nome ILIKE '%receita%'             AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'custo_administrativo'  WHERE nome ILIKE '%Administrativo%'      AND codigo IS NULL;
