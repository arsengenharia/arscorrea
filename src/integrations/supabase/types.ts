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
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          project_manager: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          project_manager?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          project_manager?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
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
          contact_name: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          legal_name: string | null
          phone: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          phone?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          phone?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: []
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
