export interface ParsedProposalItem {
  category: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
}

export interface ParsedProposalTotals {
  subtotal: number | null;
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
  total: number | null;
}

export interface ParsedProposalConfidence {
  scope_text: number;
  payment_terms: number;
  warranty_terms: number;
  exclusions: number;
  notes: number;
  totals: number;
  items: number;
}

export interface ParsedProposalData {
  scope_text: string | null;
  payment_terms: string | null;
  warranty_terms: string | null;
  exclusions: string | null;
  notes: string | null;
  totals: ParsedProposalTotals;
  items: ParsedProposalItem[];
  confidence: ParsedProposalConfidence;
}

export interface ProposalImport {
  id: string;
  created_by: string;
  client_id: string | null;
  proposal_id: string | null;
  file_path: string;
  extracted_text: string | null;
  parsed_json: ParsedProposalData | null;
  status: "queued" | "extracting" | "parsing" | "done" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
