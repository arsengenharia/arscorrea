import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ToolDef {
  name: string;
  description: string;
  input_schema: any;
  requires_confirmation: boolean;
}

export async function loadTools(supabase: SupabaseClient, userRole: string): Promise<ToolDef[]> {
  const { data: tools } = await supabase
    .from("ai_tool_registry")
    .select("name, description, parameters_schema, required_roles, requires_confirmation")
    .eq("ativo", true);

  if (!tools) return [];

  return tools
    .filter((t: any) => t.required_roles.includes(userRole))
    .map((t: any) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters_schema,
      requires_confirmation: t.requires_confirmation,
    }));
}

export async function executeTool(
  supabase: SupabaseClient,
  toolName: string,
  toolInput: any
): Promise<{ result: any; error?: string }> {
  // Load tool definition
  const { data: tool } = await supabase
    .from("ai_tool_registry")
    .select("function_type, function_name")
    .eq("name", toolName)
    .single();

  if (!tool) return { result: null, error: `Tool ${toolName} not found` };

  try {
    if (tool.function_type === "rpc") {
      const { data, error } = await supabase.rpc(tool.function_name, toolInput);
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    if (tool.function_type === "direct_query") {
      // Query a view
      let query = supabase.from(tool.function_name).select("*");

      // Apply filters from input
      for (const [key, value] of Object.entries(toolInput)) {
        if (value && key !== "limit") {
          query = query.eq(key, value);
        }
      }

      query = query.limit(toolInput.limit || 50);
      const { data, error } = await query;
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    if (tool.function_type === "composite") {
      // Composite tools return instructions for the frontend, not DB results
      if (tool.function_name === "generate_report") {
        // Fetch project name for the report link description
        const { data: proj } = await supabase
          .from("projects")
          .select("name")
          .eq("id", toolInput.project_id)
          .single();
        const projectName = proj?.name || "Projeto";
        const reportType = toolInput.report_type || "financeiro";
        return {
          result: {
            action: "generate_report",
            project_id: toolInput.project_id,
            report_type: reportType,
            path: `/relatorio/${toolInput.project_id}?tipo=${reportType}`,
            description: `Relatório ${reportType} — ${projectName}`,
          },
        };
      }
      return { result: { action: tool.function_name, ...toolInput } };
    }

    if (tool.function_type === "edge_function") {
      const { data, error } = await supabase.functions.invoke(tool.function_name, {
        body: toolInput,
      });
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    return { result: null, error: `Unknown function type: ${tool.function_type}` };
  } catch (err) {
    return { result: null, error: String(err) };
  }
}
