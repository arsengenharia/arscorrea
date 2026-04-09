export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string
          conta: string
          created_at: string
          data_saldo_inicial: string
          descricao: string | null
          id: string
          saldo_inicial: number
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco: string
          conta: string
          created_at?: string
          data_saldo_inicial: string
          descricao?: string | null
          id?: string
          saldo_inicial?: number
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string
          conta?: string
          created_at?: string
          data_saldo_inicial?: string
          descricao?: string | null
          id?: string
          saldo_inicial?: number
        }
        Relationships: []
      }
      bank_reconciliations: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          lancamento_id: string
          tipo_match: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          lancamento_id: string
          tipo_match: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          lancamento_id?: string
          tipo_match?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          bank_account_id: string
          data_transacao: string
          descricao_banco: string
          id: string
          importado_em: string
          lancamento_id: string | null
          status_conciliacao: string
          tipo_origem: string
          valor: number
        }
        Insert: {
          bank_account_id: string
          data_transacao: string
          descricao_banco: string
          id?: string
          importado_em?: string
          lancamento_id?: string | null
          status_conciliacao?: string
          tipo_origem: string
          valor: number
        }
        Update: {
          bank_account_id?: string
          data_transacao?: string
          descricao_banco?: string
          id?: string
          importado_em?: string
          lancamento_id?: string | null
          status_conciliacao?: string
          tipo_origem?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_attendees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          created_by: string
          description: string | null
          end_at: string
          google_publish_url: string | null
          google_published_at: string | null
          id: string
          location: string | null
          start_at: string
          timezone: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_at: string
          google_publish_url?: string | null
          google_published_at?: string | null
          id?: string
          location?: string | null
          start_at: string
          timezone?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_at?: string
          google_publish_url?: string | null
          google_published_at?: string | null
          id?: string
          location?: string | null
          start_at?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string | null
          file_type: string | null
          file_url: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          proposal_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          proposal_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          proposal_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          client_type: string | null
          code: string
          complement: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          lead_channel: string | null
          lead_date: string | null
          lead_referral: string | null
          name: string
          neighborhood: string | null
          number: string | null
          observations: string | null
          phone: string | null
          responsible: string | null
          segment: string | null
          service_rep: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          client_type?: string | null
          code: string
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_channel?: string | null
          lead_date?: string | null
          lead_referral?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          observations?: string | null
          phone?: string | null
          responsible?: string | null
          segment?: string | null
          service_rep?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          client_type?: string | null
          code?: string
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_channel?: string | null
          lead_date?: string | null
          lead_referral?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          observations?: string | null
          phone?: string | null
          responsible?: string | null
          segment?: string | null
          service_rep?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      contract_financial: {
        Row: {
          contract_id: string
          created_at: string | null
          description: string | null
          expected_date: string | null
          expected_value: number | null
          id: string
          notes: string | null
          received_date: string | null
          received_value: number | null
          status: string | null
          type: string
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_value?: number | null
          id?: string
          notes?: string | null
          received_date?: string | null
          received_value?: number | null
          status?: string | null
          type: string
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_value?: number | null
          id?: string
          notes?: string | null
          received_date?: string | null
          received_value?: number | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_financial_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          category: string | null
          contract_id: string
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          order_index: number | null
          quantity: number | null
          total: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          contract_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          contract_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_payments: {
        Row: {
          contract_id: string
          created_at: string | null
          description: string | null
          expected_date: string | null
          expected_value: number | null
          id: string
          kind: string
          notes: string | null
          order_index: number | null
          received_date: string | null
          received_value: number | null
          status: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_value?: number | null
          id?: string
          kind: string
          notes?: string | null
          order_index?: number | null
          received_date?: string | null
          received_value?: number | null
          status?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_value?: number | null
          id?: string
          kind?: string
          notes?: string | null
          order_index?: number | null
          received_date?: string | null
          received_value?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes: {
        Row: {
          id: string
          project_id: string
          contract_id: string | null
          numero: number
          periodo_inicio: string
          periodo_fim: string
          valor_medido: number
          valor_acumulado: number | null
          percentual_fisico: number | null
          status: string
          responsavel: string | null
          aprovado_por: string | null
          aprovado_em: string | null
          observacoes: string | null
          documento_url: string | null
          financial_entry_id: string | null
          contract_payment_id: string | null
          created_at: string
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          project_id: string
          contract_id?: string | null
          numero: number
          periodo_inicio: string
          periodo_fim: string
          valor_medido: number
          valor_acumulado?: number | null
          percentual_fisico?: number | null
          status?: string
          responsavel?: string | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          observacoes?: string | null
          documento_url?: string | null
          financial_entry_id?: string | null
          contract_payment_id?: string | null
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          contract_id?: string | null
          numero?: number
          periodo_inicio?: string
          periodo_fim?: string
          valor_medido?: number
          valor_acumulado?: number | null
          percentual_fisico?: number | null
          status?: string
          responsavel?: string | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          observacoes?: string | null
          documento_url?: string | null
          financial_entry_id?: string | null
          contract_payment_id?: string | null
          created_at?: string
          updated_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_contract_payment_id_fkey"
            columns: ["contract_payment_id"]
            isOneToOne: false
            referencedRelation: "contract_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          additive_value: number | null
          client_id: string
          commission_expected_date: string | null
          commission_expected_value: number | null
          commission_notes: string | null
          commission_received_value: number | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          discount_type: string | null
          discount_value: number | null
          due_date: string | null
          id: string
          payment_entry_value: number | null
          payment_installment_value: number | null
          payment_installments_count: number | null
          payment_notes: string | null
          pdf_path: string | null
          project_id: string | null
          proposal_id: string
          scope_text: string | null
          status: string | null
          subtotal: number | null
          title: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          additive_value?: number | null
          client_id: string
          commission_expected_date?: string | null
          commission_expected_value?: number | null
          commission_notes?: string | null
          commission_received_value?: number | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id?: string
          payment_entry_value?: number | null
          payment_installment_value?: number | null
          payment_installments_count?: number | null
          payment_notes?: string | null
          pdf_path?: string | null
          project_id?: string | null
          proposal_id: string
          scope_text?: string | null
          status?: string | null
          subtotal?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          additive_value?: number | null
          client_id?: string
          commission_expected_date?: string | null
          commission_expected_value?: number | null
          commission_notes?: string | null
          commission_received_value?: number | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id?: string
          payment_entry_value?: number | null
          payment_installment_value?: number | null
          payment_installments_count?: number | null
          payment_notes?: string | null
          pdf_path?: string | null
          project_id?: string | null
          proposal_id?: string
          scope_text?: string | null
          status?: string | null
          subtotal?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_allocations: {
        Row: {
          created_at: string
          criado_por: string | null
          data_rateio: string
          id: string
          lancamento_id: string
          percentual: number
          project_id: string
          valor_alocado: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_rateio: string
          id?: string
          lancamento_id: string
          percentual: number
          project_id: string
          valor_alocado: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_rateio?: string
          id?: string
          lancamento_id?: string
          percentual?: number
          project_id?: string
          valor_alocado?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocations_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocations_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_catalog: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          ncm: string
          nome_padrao: string
          unidade_padrao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ncm: string
          nome_padrao: string
          unidade_padrao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ncm?: string
          nome_padrao?: string
          unidade_padrao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          ativo: boolean
          cor_hex: string
          created_at: string
          e_receita: boolean
          id: string
          nome: string
          prefixo: string
        }
        Insert: {
          ativo?: boolean
          cor_hex: string
          created_at?: string
          e_receita?: boolean
          id?: string
          nome: string
          prefixo: string
        }
        Update: {
          ativo?: boolean
          cor_hex?: string
          created_at?: string
          e_receita?: boolean
          id?: string
          nome?: string
          prefixo?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nfe_inbox: {
        Row: {
          ai_confianca: number | null
          ai_justificativa: string | null
          arquivo_path: string
          arquivo_tipo: string
          bank_account_id_selecionado: string | null
          categoria_final: string | null
          categoria_sugerida: string | null
          chave_nfe: string | null
          cnpj: string | null
          created_at: string
          data_emissao: string | null
          email_assunto: string | null
          email_recebido_em: string | null
          email_remetente: string | null
          financial_entry_id: string | null
          id: string
          itens_json: Json | null
          numero_nota: string | null
          observacao: string | null
          obras_ativas_json: Json | null
          origem: string
          project_id_selecionado: string | null
          razao_social: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: string
          supplier_id: string | null
          valor_total: number | null
        }
        Insert: {
          ai_confianca?: number | null
          ai_justificativa?: string | null
          arquivo_path: string
          arquivo_tipo: string
          bank_account_id_selecionado?: string | null
          categoria_final?: string | null
          categoria_sugerida?: string | null
          chave_nfe?: string | null
          cnpj?: string | null
          created_at?: string
          data_emissao?: string | null
          email_assunto?: string | null
          email_recebido_em?: string | null
          email_remetente?: string | null
          financial_entry_id?: string | null
          id?: string
          itens_json?: Json | null
          numero_nota?: string | null
          observacao?: string | null
          obras_ativas_json?: Json | null
          origem: string
          project_id_selecionado?: string | null
          razao_social?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          supplier_id?: string | null
          valor_total?: number | null
        }
        Update: {
          ai_confianca?: number | null
          ai_justificativa?: string | null
          arquivo_path?: string
          arquivo_tipo?: string
          bank_account_id_selecionado?: string | null
          categoria_final?: string | null
          categoria_sugerida?: string | null
          chave_nfe?: string | null
          cnpj?: string | null
          created_at?: string
          data_emissao?: string | null
          email_assunto?: string | null
          email_recebido_em?: string | null
          email_remetente?: string | null
          financial_entry_id?: string | null
          id?: string
          itens_json?: Json | null
          numero_nota?: string | null
          observacao?: string | null
          obras_ativas_json?: Json | null
          origem?: string
          project_id_selecionado?: string | null
          razao_social?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          supplier_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_inbox_bank_account_id_selecionado_fkey"
            columns: ["bank_account_id_selecionado"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_inbox_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_inbox_project_id_selecionado_fkey"
            columns: ["project_id_selecionado"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_inbox_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_inbox_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_items: {
        Row: {
          categoria_item: string | null
          cfop: string | null
          created_at: string
          descricao_original: string
          financial_entry_id: string | null
          id: string
          item_catalog_id: string | null
          ncm: string | null
          nfe_inbox_id: string
          nome_padronizado: string | null
          project_id: string | null
          quantidade: number
          supplier_id: string | null
          unidade: string | null
          valor_total: number
          valor_unitario: number | null
        }
        Insert: {
          categoria_item?: string | null
          cfop?: string | null
          created_at?: string
          descricao_original: string
          financial_entry_id?: string | null
          id?: string
          item_catalog_id?: string | null
          ncm?: string | null
          nfe_inbox_id: string
          nome_padronizado?: string | null
          project_id?: string | null
          quantidade?: number
          supplier_id?: string | null
          unidade?: string | null
          valor_total: number
          valor_unitario?: number | null
        }
        Update: {
          categoria_item?: string | null
          cfop?: string | null
          created_at?: string
          descricao_original?: string
          financial_entry_id?: string | null
          id?: string
          item_catalog_id?: string | null
          ncm?: string | null
          nfe_inbox_id?: string
          nome_padronizado?: string | null
          project_id?: string | null
          quantidade?: number
          supplier_id?: string | null
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_items_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_item_catalog_id_fkey"
            columns: ["item_catalog_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_nfe_inbox_id_fkey"
            columns: ["nfe_inbox_id"]
            isOneToOne: false
            referencedRelation: "nfe_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_event_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          photo_url: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "portal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_events: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          project_id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          project_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          project_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_budgets: {
        Row: {
          id: string
          project_id: string
          category_id: string
          valor_previsto: number
          observacoes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          category_id: string
          valor_previsto: number
          observacoes?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          category_id?: string
          valor_previsto?: number
          observacoes?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_costs: {
        Row: {
          actual_value: number
          cost_type: string
          created_at: string
          description: string | null
          expected_value: number
          id: string
          project_id: string
          record_date: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number
          cost_type?: string
          created_at?: string
          description?: string | null
          expected_value?: number
          id?: string
          project_id: string
          record_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number
          cost_type?: string
          created_at?: string
          description?: string | null
          expected_value?: number
          id?: string
          project_id?: string
          record_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financial_entries: {
        Row: {
          arquivo_url: string | null
          bank_account_id: string
          category_id: string
          chave_nfe: string | null
          contract_payment_id: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          is_comprometido: boolean
          nota_fiscal: string | null
          numero_documento: string | null
          observacoes: string | null
          project_id: string
          situacao: string
          supplier_id: string | null
          tipo_documento: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          bank_account_id: string
          category_id: string
          chave_nfe?: string | null
          contract_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          is_comprometido?: boolean
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          project_id: string
          situacao?: string
          supplier_id?: string | null
          tipo_documento: string
          valor: number
        }
        Update: {
          arquivo_url?: string | null
          bank_account_id?: string
          category_id?: string
          chave_nfe?: string | null
          contract_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          is_comprometido?: boolean
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          project_id?: string
          situacao?: string
          supplier_id?: string | null
          tipo_documento?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_financial_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_contract_payment_id_fkey"
            columns: ["contract_payment_id"]
            isOneToOne: false
            referencedRelation: "contract_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          observations: string | null
          pdf_path: string | null
          project_id: string
          report_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          observations?: string | null
          pdf_path?: string | null
          project_id: string
          report_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          observations?: string | null
          pdf_path?: string | null
          project_id?: string
          report_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revenues: {
        Row: {
          actual_value: number
          created_at: string
          description: string | null
          expected_value: number
          id: string
          project_id: string
          record_date: string | null
          revenue_type: string
          updated_at: string
        }
        Insert: {
          actual_value?: number
          created_at?: string
          description?: string | null
          expected_value?: number
          id?: string
          project_id: string
          record_date?: string | null
          revenue_type?: string
          updated_at?: string
        }
        Update: {
          actual_value?: number
          created_at?: string
          description?: string | null
          expected_value?: number
          id?: string
          project_id?: string
          record_date?: string | null
          revenue_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          bank_account_id: string | null
          client_id: string
          created_at: string
          custo_realizado: number | null
          end_date: string | null
          iec_atual: number | null
          id: string
          margem_atual: number | null
          name: string
          orcamento_previsto: number | null
          project_manager: string | null
          receita_realizada: number | null
          saldo_atual: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          client_id: string
          created_at?: string
          custo_realizado?: number | null
          end_date?: string | null
          iec_atual?: number | null
          id?: string
          margem_atual?: number | null
          name: string
          orcamento_previsto?: number | null
          project_manager?: string | null
          receita_realizada?: number | null
          saldo_atual?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          client_id?: string
          created_at?: string
          custo_realizado?: number | null
          end_date?: string | null
          iec_atual?: number | null
          id?: string
          margem_atual?: number | null
          name?: string
          orcamento_previsto?: number | null
          project_manager?: string | null
          receita_realizada?: number | null
          saldo_atual?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_imports: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          extracted_text: string | null
          file_path: string
          id: string
          parsed_json: Json | null
          proposal_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          extracted_text?: string | null
          file_path: string
          id?: string
          parsed_json?: Json | null
          proposal_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          extracted_text?: string | null
          file_path?: string
          id?: string
          parsed_json?: Json | null
          proposal_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_imports_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          order_index: number | null
          proposal_id: string
          quantity: number | null
          total: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          proposal_id: string
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          proposal_id?: string
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_stages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      proposals: {
        Row: {
          city: string | null
          client_id: string
          condo_name: string | null
          created_at: string
          created_by: string | null
          discount_type: string | null
          discount_value: number | null
          exclusions: string | null
          execution_days: number | null
          expected_close_date: string | null
          id: string
          loss_reason: string | null
          notes: string | null
          number: string | null
          payment_terms: string | null
          pdf_path: string | null
          project_id: string | null
          scope_text: string | null
          stage_id: string | null
          state: string | null
          status: string | null
          subtotal: number | null
          title: string | null
          total: number | null
          updated_at: string
          validity_days: number | null
          warranty_terms: string | null
          work_address: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          condo_name?: string | null
          created_at?: string
          created_by?: string | null
          discount_type?: string | null
          discount_value?: number | null
          exclusions?: string | null
          execution_days?: number | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          number?: string | null
          payment_terms?: string | null
          pdf_path?: string | null
          project_id?: string | null
          scope_text?: string | null
          stage_id?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string
          validity_days?: number | null
          warranty_terms?: string | null
          work_address?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          condo_name?: string | null
          created_at?: string
          created_by?: string | null
          discount_type?: string | null
          discount_value?: number | null
          exclusions?: string | null
          execution_days?: number | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          number?: string | null
          payment_terms?: string | null
          pdf_path?: string | null
          project_id?: string | null
          scope_text?: string | null
          stage_id?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string
          validity_days?: number | null
          warranty_terms?: string | null
          work_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "proposal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_photos_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          report: string | null
          report_end_date: string | null
          report_start_date: string | null
          stage_weight: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          report?: string | null
          report_end_date?: string | null
          report_start_date?: string | null
          stage_weight?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          report?: string | null
          report_end_date?: string | null
          report_start_date?: string | null
          stage_weight?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          ativo: boolean
          bairro: string | null
          categoria_padrao_id: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          complemento: string | null
          contact_name: string | null
          created_at: string
          document: string | null
          email: string | null
          estado: string | null
          id: string
          legal_name: string | null
          numero: string | null
          observacoes: string | null
          phone: string | null
          rua: string | null
          tipo: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ativo?: boolean
          bairro?: string | null
          categoria_padrao_id?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          complemento?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          legal_name?: string | null
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          rua?: string | null
          tipo?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ativo?: boolean
          bairro?: string | null
          categoria_padrao_id?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          complemento?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          legal_name?: string | null
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          rua?: string | null
          tipo?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_categoria_padrao_id_fkey"
            columns: ["categoria_padrao_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          status: string
          context_type: string | null
          context_id: string | null
          context_snapshot: Json | null
          message_count: number
          total_tokens: number
          last_message_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          status?: string
          context_type?: string | null
          context_id?: string | null
          context_snapshot?: Json | null
          message_count?: number
          total_tokens?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          status?: string
          context_type?: string | null
          context_id?: string | null
          context_snapshot?: Json | null
          message_count?: number
          total_tokens?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge: {
        Row: {
          id: string
          tipo: string
          conteudo: string
          embedding: string | null
          scope_type: string | null
          scope_id: string | null
          user_id: string | null
          ativo: boolean
          confianca: number
          vezes_usado: number
          ultimo_uso: string | null
          conversation_id: string | null
          message_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tipo: string
          conteudo: string
          embedding?: string | null
          scope_type?: string | null
          scope_id?: string | null
          user_id?: string | null
          ativo?: boolean
          confianca?: number
          vezes_usado?: number
          ultimo_uso?: string | null
          conversation_id?: string | null
          message_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tipo?: string
          conteudo?: string
          embedding?: string | null
          scope_type?: string | null
          scope_id?: string | null
          user_id?: string | null
          ativo?: boolean
          confianca?: number
          vezes_usado?: number
          ultimo_uso?: string | null
          conversation_id?: string | null
          message_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          context_used: Json | null
          sources: Json | null
          tool_name: string | null
          tool_input: Json | null
          tool_output: Json | null
          model: string | null
          tokens_input: number | null
          tokens_output: number | null
          latency_ms: number | null
          action_audit_id: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          context_used?: Json | null
          sources?: Json | null
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          latency_ms?: number | null
          action_audit_id?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          context_used?: Json | null
          sources?: Json | null
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          latency_ms?: number | null
          action_audit_id?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_registry: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string
          category: string
          function_type: string
          function_name: string
          parameters_schema: Json
          return_schema: Json | null
          required_roles: string[]
          ativo: boolean
          requires_confirmation: boolean
          risk_level: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description: string
          category: string
          function_type: string
          function_name: string
          parameters_schema: Json
          return_schema?: Json | null
          required_roles?: string[]
          ativo?: boolean
          requires_confirmation?: boolean
          risk_level?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string
          category?: string
          function_type?: string
          function_name?: string
          parameters_schema?: Json
          return_schema?: Json | null
          required_roles?: string[]
          ativo?: boolean
          requires_confirmation?: boolean
          risk_level?: string
          created_at?: string
        }
        Relationships: []
      }
      ai_user_preferences: {
        Row: {
          id: string
          user_id: string
          idioma: string
          formato_moeda: string
          projeto_padrao: string | null
          nivel_detalhe: string
          alertar_anomalias: boolean
          alertar_vencimentos: boolean
          resumo_diario: boolean
          apelidos: Json
          preferencias_extra: Json
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          idioma?: string
          formato_moeda?: string
          projeto_padrao?: string | null
          nivel_detalhe?: string
          alertar_anomalias?: boolean
          alertar_vencimentos?: boolean
          resumo_diario?: boolean
          apelidos?: Json
          preferencias_extra?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          idioma?: string
          formato_moeda?: string
          projeto_padrao?: string | null
          nivel_detalhe?: string
          alertar_anomalias?: boolean
          alertar_vencimentos?: boolean
          resumo_diario?: boolean
          apelidos?: Json
          preferencias_extra?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_user_preferences_projeto_padrao_fkey"
            columns: ["projeto_padrao"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
      ai_query_log: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          query_text: string
          response_text: string | null
          tokens_used: number | null
          model: string | null
          duration_ms: number | null
          context: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          query_text: string
          response_text?: string | null
          tokens_used?: number | null
          model?: string | null
          duration_ms?: number | null
          context?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          query_text?: string
          response_text?: string | null
          tokens_used?: number | null
          model?: string | null
          duration_ms?: number | null
          context?: Json | null
        }
        Relationships: []
      }
      anomalies: {
        Row: {
          id: string
          created_at: string
          project_id: string | null
          supplier_id: string | null
          lancamento_id: string | null
          nfe_id: string | null
          tipo: string
          severidade: string
          titulo: string
          descricao: string | null
          valor_detectado: number | null
          valor_referencia: number | null
          status: string
          resolucao_nota: string | null
          resolvida_em: string | null
          resolvida_por: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id?: string | null
          supplier_id?: string | null
          lancamento_id?: string | null
          nfe_id?: string | null
          tipo: string
          severidade: string
          titulo: string
          descricao?: string | null
          valor_detectado?: number | null
          valor_referencia?: number | null
          status?: string
          resolucao_nota?: string | null
          resolvida_em?: string | null
          resolvida_por?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string | null
          supplier_id?: string | null
          lancamento_id?: string | null
          nfe_id?: string | null
          tipo?: string
          severidade?: string
          titulo?: string
          descricao?: string | null
          valor_detectado?: number | null
          valor_referencia?: number | null
          status?: string
          resolucao_nota?: string | null
          resolvida_em?: string | null
          resolvida_por?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      margin_snapshots: {
        Row: {
          id: string
          created_at: string
          project_id: string
          mes: string
          receita: number | null
          custo: number | null
          saldo: number | null
          margem: number | null
          iec: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          mes: string
          receita?: number | null
          custo?: number | null
          saldo?: number | null
          margem?: number | null
          iec?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          mes?: string
          receita?: number | null
          custo?: number | null
          saldo?: number | null
          margem?: number | null
          iec?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_attendee: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_creator: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
    },
  },
} as const
