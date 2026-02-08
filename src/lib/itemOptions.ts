export const ITEM_CATEGORIES = [
  "Mão de Obra",
  "Material",
  "Equipamento",
  "Serviço Terceirizado",
  "Outros",
] as const;

export const ITEM_UNITS = [
  "un",
  "m²",
  "m",
  "vb",
  "dia",
  "mês",
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];
export type ItemUnit = typeof ITEM_UNITS[number];

// Helper para tratar categorias antigas/inválidas
export const normalizeCategory = (category: string | null): string => {
  if (!category) return "Outros";
  if (ITEM_CATEGORIES.includes(category as ItemCategory)) return category;
  return "Outros";
};

// Helper para tratar unidades antigas/inválidas
export const normalizeUnit = (unit: string | null): string => {
  if (!unit) return "un";
  if (ITEM_UNITS.includes(unit as ItemUnit)) return unit;
  return "un";
};
