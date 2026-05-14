import type { AuthenticatedApiKey } from "@/lib/api-keys";

export const MOCK_MODELS = [
  "gpt-5.3-codex",
  "gpt-5.2-codex",
  "gpt-5.1-codex",
] as const;

const DEFAULT_MODEL = MOCK_MODELS[0];
const MAX_ECHO_INPUT_LENGTH = 1200;
const encoder = new TextEncoder();

type JsonRecord = Record<string, unknown>;

type MockInput = {
  model: string;
  inputText: string;
  stream: boolean;
};

type MockContext = {
  apiKey: AuthenticatedApiKey;
  endpoint: "responses" | "chat.completions";
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function readTextPart(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const text = value.text;
  if (typeof text === "string") return text;

  const content = value.content;
  if (typeof content === "string") return content;

  return "";
}

function extractInputText(value: unknown): string {
  if (typeof value === "string") return compactWhitespace(value);

  if (Array.isArray(value)) {
    return compactWhitespace(
      value
        .map((item) => {
          if (typeof item === "string") return item;
          if (!isRecord(item)) return "";

          const content = item.content;
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content.map(readTextPart).filter(Boolean).join("\n");
          }

          return readTextPart(item);
        })
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (isRecord(value)) {
    return compactWhitespace(readTextPart(value));
  }

  return "";
}

function extractChatText(messages: unknown): string {
  if (!Array.isArray(messages)) return "";

  return compactWhitespace(
    messages
      .map((message) => {
        if (!isRecord(message)) return "";
        const role = typeof message.role === "string" ? message.role : "user";
        const content = message.content;
        const text = Array.isArray(content)
          ? content.map(readTextPart).filter(Boolean).join("\n")
          : readTextPart({ content });
        return text ? `${role}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n"),
  );
}

function normalizeModel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_MODEL;
  return value.trim();
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sseData(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function responseSseEvent(type: string, data: unknown) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function splitMockText(text: string) {
  const parts = text.match(/.{1,80}(\s|$)/g)?.map((part) => part.trimEnd()) ?? [text];
  return parts.filter(Boolean);
}

function formatEchoInput(value: string) {
  if (value.length <= MAX_ECHO_INPUT_LENGTH) return value;
  return `${value.slice(0, MAX_ECHO_INPUT_LENGTH)}... [truncated ${value.length - MAX_ECHO_INPUT_LENGTH} chars]`;
}

export async function readJsonBody(request: Request) {
  try {
    const value = await request.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

export function parseResponsesInput(body: JsonRecord): MockInput {
  return {
    model: normalizeModel(body.model),
    inputText: extractInputText(body.input) || "(empty input)",
    stream: body.stream === true,
  };
}

export function parseChatInput(body: JsonRecord): MockInput {
  return {
    model: normalizeModel(body.model),
    inputText: extractChatText(body.messages) || "(empty messages)",
    stream: body.stream === true,
  };
}

export function buildMockText(input: MockInput, context: MockContext) {
  return [
    `ChatUOS mock response from ${context.endpoint}.`,
    `Model: ${input.model}.`,
    `Authenticated key: ${context.apiKey.keyPrefix}...`,
    `Received request: ${formatEchoInput(input.inputText)}`,
    "This is simulated output while no contributor Codex worker is connected yet.",
  ].join("\n");
}

export function createResponsesJson(input: MockInput, context: MockContext) {
  const responseId = makeId("resp");
  const outputId = makeId("msg");
  const text = buildMockText(input, context);
  const inputTokens = estimateTokens(input.inputText);
  const outputTokens = estimateTokens(text);
  const createdAt = nowSeconds();

  return {
    id: responseId,
    object: "response",
    created_at: createdAt,
    completed_at: createdAt,
    status: "completed",
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    model: input.model,
    output: [
      {
        id: outputId,
        type: "message",
        status: "completed",
        role: "assistant",
        phase: "final_answer",
        content: [
          {
            type: "output_text",
            text,
            annotations: [],
          },
        ],
      },
    ],
    output_text: text,
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: {
      effort: null,
      summary: null,
    },
    store: true,
    temperature: 1,
    text: {
      format: {
        type: "text",
      },
    },
    tool_choice: "auto",
    tools: [],
    top_p: 1,
    truncation: "disabled",
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      output_tokens_details: {
        reasoning_tokens: 0,
      },
      total_tokens: inputTokens + outputTokens,
    },
    user: null,
    metadata: {
      mock: true,
      owner: context.apiKey.userId,
    },
  };
}

export function createChatJson(input: MockInput, context: MockContext) {
  const text = buildMockText(input, context);
  const inputTokens = estimateTokens(input.inputText);
  const outputTokens = estimateTokens(text);

  return {
    id: makeId("chatcmpl"),
    object: "chat.completion",
    created: nowSeconds(),
    model: input.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
    system_fingerprint: "chatuos-mock",
  };
}

export function createResponsesStream(input: MockInput, context: MockContext) {
  const response = createResponsesJson(input, context);
  const text = response.output_text;
  const outputItem = response.output[0];
  const contentPart = outputItem.content[0];
  let sequenceNumber = 0;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (type: string, data: JsonRecord = {}) => {
        sequenceNumber += 1;
        controller.enqueue(
          encoder.encode(
            responseSseEvent(type, {
              type,
              sequence_number: sequenceNumber,
              ...data,
            }),
          ),
        );
      };

      write("response.created", {
        response: { ...response, status: "in_progress", output: [] },
      });
      await sleep(250);
      write("response.in_progress", {
        response: { ...response, status: "in_progress", output: [] },
      });
      await sleep(250);
      write("response.output_item.added", {
        response_id: response.id,
        output_index: 0,
        item: { ...outputItem, status: "in_progress", content: [] },
      });
      await sleep(250);
      write("response.content_part.added", {
        response_id: response.id,
        item_id: outputItem.id,
        output_index: 0,
        content_index: 0,
        part: { ...contentPart, text: "" },
      });

      for (const delta of splitMockText(text)) {
        await sleep(300);
        write("response.output_text.delta", {
          response_id: response.id,
          item_id: outputItem.id,
          output_index: 0,
          content_index: 0,
          delta: `${delta}\n`,
        });
      }

      write("response.output_text.done", {
        response_id: response.id,
        item_id: outputItem.id,
        output_index: 0,
        content_index: 0,
        text,
      });
      write("response.content_part.done", {
        response_id: response.id,
        item_id: outputItem.id,
        output_index: 0,
        content_index: 0,
        part: contentPart,
      });
      write("response.output_item.done", {
        response_id: response.id,
        output_index: 0,
        item: outputItem,
      });
      write("response.completed", { response });
      controller.close();
    },
  });
}

export function createChatStream(input: MockInput, context: MockContext) {
  const completionId = makeId("chatcmpl");
  const created = nowSeconds();
  const text = buildMockText(input, context);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (data: unknown) => controller.enqueue(encoder.encode(sseData(data)));

      write({
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: input.model,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      });

      for (const delta of splitMockText(text)) {
        await sleep(300);
        write({
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model: input.model,
          choices: [
            {
              index: 0,
              delta: { content: `${delta}\n` },
              finish_reason: null,
            },
          ],
        });
      }

      write({
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: input.model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export function streamResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export function listModels() {
  const created = 1778716800;
  return {
    object: "list",
    data: MOCK_MODELS.map((id) => ({
      id,
      object: "model",
      created,
      owned_by: "chatuos",
    })),
  };
}
