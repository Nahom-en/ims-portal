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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approval_logs: {
        Row: {
          action: Database["public"]["Enums"]["workflow_action"]
          actor_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          report_cycle_id: string | null
          step_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["workflow_action"]
          actor_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          report_cycle_id?: string | null
          step_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["workflow_action"]
          actor_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          report_cycle_id?: string | null
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_report_cycle_id_fkey"
            columns: ["report_cycle_id"]
            isOneToOne: false
            referencedRelation: "report_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          department_name: string
          id: string
          manager_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_name: string
          id?: string
          manager_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_name?: string
          id?: string
          manager_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          department_id: string | null
          email: string
          firstname: string
          id: string
          is_active: boolean | null
          lastname: string
          phone_number: string | null
          role: Database["public"]["Enums"]["employee_role"]
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          firstname: string
          id?: string
          is_active?: boolean | null
          lastname: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          firstname?: string
          id?: string
          is_active?: boolean | null
          lastname?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          analysis_frequency: Database["public"]["Enums"]["analysis_frequency"]
          created_at: string | null
          custom_metadata: Json | null
          id: string
          is_active: boolean | null
          kpi_name: string
          process_id: string | null
          source: string
          target_value: string
          updated_at: string | null
        }
        Insert: {
          analysis_frequency: Database["public"]["Enums"]["analysis_frequency"]
          created_at?: string | null
          custom_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          kpi_name: string
          process_id?: string | null
          source: string
          target_value: string
          updated_at?: string | null
        }
        Update: {
          analysis_frequency?: Database["public"]["Enums"]["analysis_frequency"]
          created_at?: string | null
          custom_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          kpi_name?: string
          process_id?: string | null
          source?: string
          target_value?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_measurements: {
        Row: {
          actual_value: string | null
          created_at: string | null
          id: string
          justification_for_deviation: string | null
          kpi_id: string | null
          period_end: string | null
          period_start: string | null
          report_cycle_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_value?: string | null
          created_at?: string | null
          id?: string
          justification_for_deviation?: string | null
          kpi_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_cycle_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_value?: string | null
          created_at?: string | null
          id?: string
          justification_for_deviation?: string | null
          kpi_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_cycle_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_measurements_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_measurements_report_cycle_id_fkey"
            columns: ["report_cycle_id"]
            isOneToOne: false
            referencedRelation: "report_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_definitions: {
        Row: {
          created_at: string | null
          custom_metadata: Json | null
          department_id: string | null
          end_date: string
          id: string
          is_active: boolean | null
          objective_description: string
          manager_id: string | null
          start_date: string
          success_criteria: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_metadata?: Json | null
          department_id?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          objective_description: string
          start_date: string
          success_criteria?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_metadata?: Json | null
          department_id?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          objective_description?: string
          start_date?: string
          success_criteria?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_definitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_kpi_mapping: {
        Row: {
          created_at: string | null
          kpi_id: string
          objective_id: string
        }
        Insert: {
          created_at?: string | null
          kpi_id: string
          objective_id: string
        }
        Update: {
          created_at?: string | null
          kpi_id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_kpi_mapping_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_kpi_mapping_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_tracking: {
        Row: {
          created_at: string | null
          evidence_of_achievement: string | null
          followup_action: string | null
          id: string
          objective_id: string | null
          reasons_for_deviation: string | null
          report_cycle_id: string | null
          status_vs_target: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_of_achievement?: string | null
          followup_action?: string | null
          id?: string
          objective_id?: string | null
          reasons_for_deviation?: string | null
          report_cycle_id?: string | null
          status_vs_target?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_of_achievement?: string | null
          followup_action?: string | null
          id?: string
          objective_id?: string | null
          reasons_for_deviation?: string | null
          report_cycle_id?: string | null
          status_vs_target?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_tracking_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_tracking_report_cycle_id_fkey"
            columns: ["report_cycle_id"]
            isOneToOne: false
            referencedRelation: "report_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          process_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          process_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          process_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cycles: {
        Row: {
          created_at: string | null
          current_step_index: number
          department_id: string | null
          id: string
          reporting_period: string
          submitted_by: string | null
          updated_at: string | null
          workflow_status: Database["public"]["Enums"]["workflow_status"]
        }
        Insert: {
          created_at?: string | null
          current_step_index?: number
          department_id?: string | null
          id?: string
          reporting_period: string
          submitted_by?: string | null
          updated_at?: string | null
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Update: {
          created_at?: string | null
          current_step_index?: number
          department_id?: string | null
          id?: string
          reporting_period?: string
          submitted_by?: string | null
          updated_at?: string | null
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "report_cycles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cycles_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          created_at: string | null
          evidence_for_solutions: string | null
          followup_measure: string | null
          id: string
          reason_for_deviation: string | null
          report_cycle_id: string | null
          residual_likelihood: number | null
          residual_severity: number | null
          risk_id: string | null
          treatment_effectiveness:
            | Database["public"]["Enums"]["treatment_effectiveness"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_for_solutions?: string | null
          followup_measure?: string | null
          id?: string
          reason_for_deviation?: string | null
          report_cycle_id?: string | null
          residual_likelihood?: number | null
          residual_severity?: number | null
          risk_id?: string | null
          treatment_effectiveness?:
            | Database["public"]["Enums"]["treatment_effectiveness"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_for_solutions?: string | null
          followup_measure?: string | null
          id?: string
          reason_for_deviation?: string | null
          report_cycle_id?: string | null
          residual_likelihood?: number | null
          residual_severity?: number | null
          risk_id?: string | null
          treatment_effectiveness?:
            | Database["public"]["Enums"]["treatment_effectiveness"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_report_cycle_id_fkey"
            columns: ["report_cycle_id"]
            isOneToOne: false
            referencedRelation: "report_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risk_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_definitions: {
        Row: {
          affected_assets: string
          baseline_likelihood: number
          baseline_severity: number
          created_at: string | null
          custom_metadata: Json | null
          id: string
          is_active: boolean | null
          owner_id: string | null
          procedure_id: string | null
          risk_statement: string
          threat: string
          treatment_solution: string
          updated_at: string | null
          vulnerability: string
        }
        Insert: {
          affected_assets: string
          baseline_likelihood: number
          baseline_severity: number
          created_at?: string | null
          custom_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          procedure_id?: string | null
          risk_statement: string
          threat: string
          treatment_solution: string
          updated_at?: string | null
          vulnerability: string
        }
        Update: {
          affected_assets?: string
          baseline_likelihood?: number
          baseline_severity?: number
          created_at?: string | null
          custom_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          procedure_id?: string | null
          risk_statement?: string
          threat?: string
          treatment_solution?: string
          updated_at?: string | null
          vulnerability?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_definitions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_definitions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "risk_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_procedures: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          procedure_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          procedure_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          procedure_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_procedures_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          steps: Json
          approver_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          steps?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analysis_frequency: "MONTHLY" | "QUARTERLY" | "BI_YEARLY" | "YEARLY"
      employee_role:
        | "SYSTEM_ADMIN"
        | "WRITER"
        
        | "VIEWER"
      treatment_effectiveness: "MAINTAIN" | "CORRECTION" | "IMPROVEMENT"
      workflow_action: "SUBMITTED" | "APPROVED" | "REJECTED"
        | "PUBLISHED"
      workflow_status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
        | "PUBLISHED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      analysis_frequency: ["MONTHLY", "QUARTERLY", "BI_YEARLY", "YEARLY"],
      employee_role: [
        "SYSTEM_ADMIN",
        "WRITER",
        
        "VIEWER",
      ],
      treatment_effectiveness: ["MAINTAIN", "CORRECTION", "IMPROVEMENT"],
      workflow_action: ["SUBMITTED", "APPROVED", "REJECTED", "PUBLISHED"],
      workflow_status: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED"],
    },
  },
} as const
