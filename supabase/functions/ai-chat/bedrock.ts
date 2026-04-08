import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

interface BedrockMessage {
  role: "user" | "assistant";
  content: string | any[];
}

interface BedrockTool {
  name: string;
  description: string;
  input_schema: any;
}

interface BedrockRequest {
  system: string;
  messages: BedrockMessage[];
  tools?: BedrockTool[];
  max_tokens: number;
  anthropic_version: string;
}

interface BedrockResponse {
  content: Array<{
    type: "text" | "tool_use";
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  usage: { input_tokens: number; output_tokens: number };
}

export async function callBedrock(
  systemPrompt: string,
  messages: BedrockMessage[],
  tools?: BedrockTool[]
): Promise<BedrockResponse> {
  const region = Deno.env.get("AWS_REGION") || "us-east-1";
  const modelId = "us.anthropic.claude-sonnet-4-6";

  const aws = new AwsClient({
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    region,
    service: "bedrock",
  });

  const body: BedrockRequest = {
    anthropic_version: "bedrock-2023-05-31",
    system: systemPrompt,
    messages,
    max_tokens: 4096,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`;

  const response = await aws.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Bedrock error ${response.status}: ${errText}`);
  }

  return await response.json();
}
