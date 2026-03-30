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
      ai_conversations: {
        Row: {
          context_id: string | null
          context_snapshot: Json | null
          context_type: string | null
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          status: string
          title: string | null
          total_tokens: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_snapshot?: Json | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          status?: string
          title?: string | null
          total_tokens?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_snapshot?: Json | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          status?: string
          title?: string | null
          total_tokens?: number
          updated_at?: string | null
          user_id?: string
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
          ativo: boolean
          confianca: number
          conteudo: string
          conversation_id: string | null
          created_at: string
          embedding: string | null
          id: string
          message_id: string | null
          scope_id: string | null
          scope_type: string | null
          tipo: string
          ultimo_uso: string | null
          updated_at: string | null
          user_id: string | null
          vezes_usado: number
        }
        Insert: {
          ativo?: boolean
          confianca?: number
          conteudo: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          message_id?: string | null
          scope_id?: string | null
          scope_type?: string | null
          tipo: string
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id?: string | null
          vezes_usado?: number
        }
        Update: {
          ativo?: boolean
          confianca?: number
          conteudo?: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          message_id?: string | null
          scope_id?: string | null
          scope_type?: string | null
          tipo?: string
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id?: string | null
          vezes_usado?: number
        }
        Relationships: [
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
          {
            foreignKeyName: "ai_knowledge_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          action_audit_id: number | null
          content: string
          context_used: Json | null
          conversation_id: string
          created_at: string
          id: string
          latency_ms: number | null
          model: string | null
          role: string
          sources: Json | null
          tokens_input: number | null
          tokens_output: number | null
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
        }
        Insert: {
          action_audit_id?: number | null
          content: string
          context_used?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          role: string
          sources?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Update: {
          action_audit_id?: number | null
          content?: string
          context_used?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          role?: string
          sources?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
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
      ai_query_log: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          error_message: string | null
          id: number
          latency_ms: number | null
          model: string | null
          module: string
          prompt: string
          response: string | null
          success: boolean
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          model?: string | null
          module: string
          prompt: string
          response?: string | null
          success?: boolean
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          model?: string | null
          module?: string
          prompt?: string
          response?: string | null
          success?: boolean
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_tool_registry: {
        Row: {
          ativo: boolean
          category: string
          created_at: string
          description: string
          display_name: string
          function_name: string
          function_type: string
          id: string
          name: string
          parameters_schema: Json
          required_roles: string[]
          requires_confirmation: boolean
          return_schema: Json | null
          risk_level: string
        }
        Insert: {
          ativo?: boolean
          category: string
          created_at?: string
          description: string
          display_name: string
          function_name: string
          function_type: string
          id?: string
          name: string
          parameters_schema: Json
          required_roles?: string[]
          requires_confirmation?: boolean
          return_schema?: Json | null
          risk_level?: string
        }
        Update: {
          ativo?: boolean
          category?: string
          created_at?: string
          description?: string
          display_name?: string
          function_name?: string
          function_type?: string
          id?: string
          name?: string
          parameters_schema?: Json
          required_roles?: string[]
          requires_confirmation?: boolean
          return_schema?: Json | null
          risk_level?: string
        }
        Relationships: []
      }
      ai_user_preferences: {
        Row: {
          alertar_anomalias: boolean
          alertar_vencimentos: boolean
          apelidos: Json | null
          created_at: string
          formato_moeda: string
          id: string
          idioma: string
          nivel_detalhe: string
          preferencias_extra: Json | null
          projeto_padrao: string | null
          resumo_diario: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alertar_anomalias?: boolean
          alertar_vencimentos?: boolean
          apelidos?: Json | null
          created_at?: string
          formato_moeda?: string
          id?: string
          idioma?: string
          nivel_detalhe?: string
          preferencias_extra?: Json | null
          projeto_padrao?: string | null
          resumo_diario?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alertar_anomalias?: boolean
          alertar_vencimentos?: boolean
          apelidos?: Json | null
          created_at?: string
          formato_moeda?: string
          id?: string
          idioma?: string
          nivel_detalhe?: string
          preferencias_extra?: Json | null
          projeto_padrao?: string | null
          resumo_diario?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_preferences_projeto_padrao_fkey"
            columns: ["projeto_padrao"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_user_preferences_projeto_padrao_fkey"
            columns: ["projeto_padrao"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_user_preferences_projeto_padrao_fkey"
            columns: ["projeto_padrao"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_user_preferences_projeto_padrao_fkey"
            columns: ["projeto_padrao"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anomalies: {
        Row: {
          contract_id: string | null
          created_at: string
          descricao: string
          detectado_por: string
          entry_id: string | null
          evidencia_json: Json | null
          id: string
          nfe_inbox_id: string | null
          percentual_desvio: number | null
          project_id: string | null
          resolucao_nota: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          status: string
          supplier_id: string | null
          tipo: string
          titulo: string
          valor_encontrado: number | null
          valor_esperado: number | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          descricao: string
          detectado_por?: string
          entry_id?: string | null
          evidencia_json?: Json | null
          id?: string
          nfe_inbox_id?: string | null
          percentual_desvio?: number | null
          project_id?: string | null
          resolucao_nota?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          status?: string
          supplier_id?: string | null
          tipo: string
          titulo: string
          valor_encontrado?: number | null
          valor_esperado?: number | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          descricao?: string
          detectado_por?: string
          entry_id?: string | null
          evidencia_json?: Json | null
          id?: string
          nfe_inbox_id?: string | null
          percentual_desvio?: number | null
          project_id?: string | null
          resolucao_nota?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          status?: string
          supplier_id?: string | null
          tipo?: string
          titulo?: string
          valor_encontrado?: number | null
          valor_esperado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "project_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "anomalies_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "anomalies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: number
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
          file_name: string
          file_url: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
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
          {
            foreignKeyName: "client_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "cost_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
        ]
      }
      document_summaries: {
        Row: {
          content_text: string | null
          created_at: string
          filename: string | null
          id: string
          keywords: string[] | null
          project_id: string | null
          source_id: string
          source_type: string
          summary: string | null
          supplier_id: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          keywords?: string[] | null
          project_id?: string | null
          source_id: string
          source_type: string
          summary?: string | null
          supplier_id?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          keywords?: string[] | null
          project_id?: string | null
          source_id?: string
          source_type?: string
          summary?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_summaries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_summaries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "document_summaries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          ativo: boolean
          codigo: string | null
          cor_hex: string
          created_at: string
          e_receita: boolean
          id: string
          nome: string
          prefixo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          cor_hex: string
          created_at?: string
          e_receita?: boolean
          id?: string
          nome: string
          prefixo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          cor_hex?: string
          created_at?: string
          e_receita?: boolean
          id?: string
          nome?: string
          prefixo?: string
          updated_at?: string | null
        }
        Relationships: []
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
      margin_snapshots: {
        Row: {
          avanco_previsto: number | null
          avanco_real: number | null
          created_at: string
          custo: number
          id: string
          iec: number | null
          ifec: number | null
          margem: number | null
          mes: string
          project_id: string
          receita: number
          saldo: number
        }
        Insert: {
          avanco_previsto?: number | null
          avanco_real?: number | null
          created_at?: string
          custo?: number
          id?: string
          iec?: number | null
          ifec?: number | null
          margem?: number | null
          mes: string
          project_id: string
          receita?: number
          saldo?: number
        }
        Update: {
          avanco_previsto?: number | null
          avanco_real?: number | null
          created_at?: string
          custo?: number
          id?: string
          iec?: number | null
          ifec?: number | null
          margem?: number | null
          mes?: string
          project_id?: string
          receita?: number
          saldo?: number
        }
        Relationships: [
          {
            foreignKeyName: "margin_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "margin_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "margin_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
        ]
      }
      medicoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          contract_id: string | null
          contract_payment_id: string | null
          created_at: string
          created_by: string | null
          documento_url: string | null
          financial_entry_id: string | null
          id: string
          numero: number
          observacoes: string | null
          percentual_fisico: number | null
          periodo_fim: string
          periodo_inicio: string
          project_id: string
          responsavel: string | null
          status: string
          updated_at: string | null
          valor_acumulado: number | null
          valor_medido: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          contract_id?: string | null
          contract_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_url?: string | null
          financial_entry_id?: string | null
          id?: string
          numero: number
          observacoes?: string | null
          percentual_fisico?: number | null
          periodo_fim: string
          periodo_inicio: string
          project_id: string
          responsavel?: string | null
          status?: string
          updated_at?: string | null
          valor_acumulado?: number | null
          valor_medido: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          contract_id?: string | null
          contract_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_url?: string | null
          financial_entry_id?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          percentual_fisico?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          project_id?: string
          responsavel?: string | null
          status?: string
          updated_at?: string | null
          valor_acumulado?: number | null
          valor_medido?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "medicoes_contract_payment_id_fkey"
            columns: ["contract_payment_id"]
            isOneToOne: false
            referencedRelation: "contract_payments"
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
            foreignKeyName: "medicoes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "medicoes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "medicoes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
        ]
      }
      nfe_inbox: {
        Row: {
          ai_confianca: number | null
          ai_justificativa: string | null
          arquivo_path: string
          arquivo_tipo: Database["public"]["Enums"]["nfe_arquivo_tipo"]
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
          obras_ativas_json: Json | null
          observacao: string | null
          origem: Database["public"]["Enums"]["nfe_origem"]
          project_id_selecionado: string | null
          razao_social: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: Database["public"]["Enums"]["nfe_status"]
          supplier_id: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          ai_confianca?: number | null
          ai_justificativa?: string | null
          arquivo_path: string
          arquivo_tipo: Database["public"]["Enums"]["nfe_arquivo_tipo"]
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
          obras_ativas_json?: Json | null
          observacao?: string | null
          origem: Database["public"]["Enums"]["nfe_origem"]
          project_id_selecionado?: string | null
          razao_social?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          supplier_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          ai_confianca?: number | null
          ai_justificativa?: string | null
          arquivo_path?: string
          arquivo_tipo?: Database["public"]["Enums"]["nfe_arquivo_tipo"]
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
          obras_ativas_json?: Json | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["nfe_origem"]
          project_id_selecionado?: string | null
          razao_social?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          supplier_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "nfe_inbox_project_id_selecionado_fkey"
            columns: ["project_id_selecionado"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "nfe_inbox_project_id_selecionado_fkey"
            columns: ["project_id_selecionado"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "nfe_inbox_project_id_selecionado_fkey"
            columns: ["project_id_selecionado"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "nfe_inbox_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "nfe_inbox_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
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
            foreignKeyName: "nfe_items_item_catalog_id_fkey"
            columns: ["item_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["catalog_id"]
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
            foreignKeyName: "nfe_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "nfe_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "nfe_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "nfe_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "nfe_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
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
          {
            foreignKeyName: "portal_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "portal_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "portal_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          category_id: string
          created_at: string
          id: string
          observacoes: string | null
          project_id: string
          updated_at: string | null
          valor_previsto: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          project_id: string
          updated_at?: string | null
          valor_previsto: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          project_id?: string
          updated_at?: string | null
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "project_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "project_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
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
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          data_pagamento: string | null
          data_vencimento: string | null
          id: string
          is_comprometido: boolean
          nota_fiscal: string | null
          numero_documento: string | null
          observacoes: string | null
          project_id: string
          situacao: string
          supplier_id: string | null
          tipo_documento: string
          updated_at: string | null
          updated_by: string | null
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
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          is_comprometido?: boolean
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          project_id: string
          situacao?: string
          supplier_id?: string | null
          tipo_documento: string
          updated_at?: string | null
          updated_by?: string | null
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
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          is_comprometido?: boolean
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          project_id?: string
          situacao?: string
          supplier_id?: string | null
          tipo_documento?: string
          updated_at?: string | null
          updated_by?: string | null
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
            foreignKeyName: "project_financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "project_financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_category_summary"
            referencedColumns: ["category_id"]
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
            foreignKeyName: "project_financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_item_price_analysis"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "project_financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "project_financial_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress_baseline: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mes: string
          observacao: string | null
          percentual_previsto: number
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes: string
          observacao?: string | null
          percentual_previsto: number
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: string
          observacao?: string | null
          percentual_previsto?: number
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_baseline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          avanco_previsto: number | null
          avanco_real: number | null
          bank_account_id: string | null
          client_id: string
          created_at: string
          custo_realizado: number | null
          end_date: string | null
          id: string
          iec_atual: number | null
          ifec_atual: number | null
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
          avanco_previsto?: number | null
          avanco_real?: number | null
          bank_account_id?: string | null
          client_id: string
          created_at?: string
          custo_realizado?: number | null
          end_date?: string | null
          id?: string
          iec_atual?: number | null
          ifec_atual?: number | null
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
          avanco_previsto?: number | null
          avanco_real?: number | null
          bank_account_id?: string | null
          client_id?: string
          created_at?: string
          custo_realizado?: number | null
          end_date?: string | null
          id?: string
          iec_atual?: number | null
          ifec_atual?: number | null
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
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "suppliers_categoria_padrao_id_fkey"
            columns: ["categoria_padrao_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "suppliers_categoria_padrao_id_fkey"
            columns: ["categoria_padrao_id"]
            isOneToOne: false
            referencedRelation: "v_category_summary"
            referencedColumns: ["category_id"]
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
    Views: {
      v_budget_vs_actual: {
        Row: {
          categoria: string | null
          category_id: string | null
          cor_hex: string | null
          diferenca: number | null
          iec_categoria: number | null
          orcamento: number | null
          prefixo: string | null
          project_id: string | null
          project_name: string | null
          realizado: number | null
        }
        Relationships: []
      }
      v_cash_flow_projection: {
        Row: {
          cliente: string | null
          contrato: string | null
          data_prevista: string | null
          faixa: string | null
          project_id: string | null
          project_name: string | null
          saldo_a_receber: number | null
          status: string | null
          tipo: string | null
          valor_previsto: number | null
          valor_recebido: number | null
        }
        Relationships: []
      }
      v_category_summary: {
        Row: {
          category_id: string | null
          codigo: string | null
          cor_hex: string | null
          e_receita: boolean | null
          nome: string | null
          prefixo: string | null
          qtd_fornecedores: number | null
          qtd_lancamentos: number | null
          qtd_obras: number | null
          total_custo: number | null
          total_receita: number | null
        }
        Relationships: []
      }
      v_ifec_overview: {
        Row: {
          avanco_previsto: number | null
          avanco_real: number | null
          custo_realizado: number | null
          end_date: string | null
          iec_atual: number | null
          iec_status: string | null
          ifec_atual: number | null
          ifec_status: string | null
          orcamento_previsto: number | null
          project_id: string | null
          project_name: string | null
          saude_obra: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          avanco_previsto?: number | null
          avanco_real?: number | null
          custo_realizado?: number | null
          end_date?: string | null
          iec_atual?: number | null
          iec_status?: never
          ifec_atual?: number | null
          ifec_status?: never
          orcamento_previsto?: number | null
          project_id?: string | null
          project_name?: string | null
          saude_obra?: never
          start_date?: string | null
          status?: string | null
        }
        Update: {
          avanco_previsto?: number | null
          avanco_real?: number | null
          custo_realizado?: number | null
          end_date?: string | null
          iec_atual?: number | null
          iec_status?: never
          ifec_atual?: number | null
          ifec_status?: never
          orcamento_previsto?: number | null
          project_id?: string | null
          project_name?: string | null
          saude_obra?: never
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      v_item_price_analysis: {
        Row: {
          catalog_id: string | null
          categoria: string | null
          desvio_padrao: number | null
          fornecedor: string | null
          ncm: string | null
          nome_padrao: string | null
          preco_maximo: number | null
          preco_medio: number | null
          preco_minimo: number | null
          qtd_compras: number | null
          supplier_id: string | null
          ultima_compra: string | null
          unidade_padrao: string | null
        }
        Relationships: []
      }
      v_monthly_by_project: {
        Row: {
          categoria: string | null
          category_id: string | null
          custo: number | null
          mes: string | null
          project_id: string | null
          project_name: string | null
          qtd_lancamentos: number | null
          receita: number | null
          saldo: number | null
          tipo: string | null
        }
        Relationships: []
      }
      v_progress_timeline: {
        Row: {
          mes: string | null
          percentual_previsto: number | null
          percentual_real: number | null
          project_id: string | null
          project_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_budget_vs_actual"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_projection"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_progress_baseline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_ifec_overview"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_supplier_summary: {
        Row: {
          cnpj: string | null
          primeiro_lancamento: string | null
          qtd_lancamentos: number | null
          qtd_obras: number | null
          supplier_id: string | null
          ticket_medio: number | null
          total_pago: number | null
          trade_name: string | null
          ultimo_lancamento: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_build_context: {
        Args: {
          p_context_id?: string
          p_context_type?: string
          p_user_id?: string
        }
        Returns: Json
      }
      calc_project_balance: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      capture_margin_snapshots: { Args: never; Returns: number }
      detect_data_quality_issues: { Args: never; Returns: number }
      detect_financial_anomalies: { Args: never; Returns: number }
      detect_price_outliers: { Args: never; Returns: number }
      get_avanco_previsto: {
        Args: { p_date?: string; p_project_id: string }
        Returns: number
      }
      get_avanco_real: { Args: { p_project_id: string }; Returns: number }
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
      app_role: "admin" | "client" | "financeiro"
      nfe_arquivo_tipo: "xml" | "pdf"
      nfe_origem: "email" | "upload_manual" | "entrada_manual"
      nfe_status:
        | "recebido"
        | "processando"
        | "aguardando_revisao"
        | "aprovado"
        | "rejeitado"
        | "duplicata"
        | "erro"
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
      app_role: ["admin", "client", "financeiro"],
      nfe_arquivo_tipo: ["xml", "pdf"],
      nfe_origem: ["email", "upload_manual", "entrada_manual"],
      nfe_status: [
        "recebido",
        "processando",
        "aguardando_revisao",
        "aprovado",
        "rejeitado",
        "duplicata",
        "erro",
      ],
    },
  },
} as const
