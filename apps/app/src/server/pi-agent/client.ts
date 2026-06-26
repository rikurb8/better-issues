import { Agent } from '@earendil-works/pi-agent-core';
import { createModels } from '@earendil-works/pi-ai';
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter';
import type { AssistantMessage } from '@earendil-works/pi-ai';

export type PiMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type PiRequest = { action: string; messages: PiMessage[]; metadata?: Record<string, unknown> };
export type PiResponse = { text: string; raw?: unknown };

export interface PiAgentClient { run(request: PiRequest): Promise<PiResponse>; }

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';

function assistantText(message: AssistantMessage | undefined) {
  return message?.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('') ?? '';
}

export class EnvPiAgentClient implements PiAgentClient {
  constructor(
    private apiKey = process.env.OPENROUTER_API_KEY,
    private modelId = process.env.PI_AGENT_MODEL || DEFAULT_MODEL,
  ) {}

  async run(request: PiRequest): Promise<PiResponse> {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is required to run Pi Agent analysis.');

    const models = createModels();
    models.setProvider(openrouterProvider());
    let model = models.getModel('openrouter', this.modelId);
    if (!model) {
      await models.refresh('openrouter');
      model = models.getModel('openrouter', this.modelId);
    }
    if (!model) throw new Error(`OpenRouter model not found: ${this.modelId}`);

    const systemPrompt = request.messages.find((message) => message.role === 'system')?.content ?? 'You are a helpful assistant.';
    const prompt = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');

    const agent = new Agent({
      initialState: { systemPrompt, model },
      streamFn: models.streamSimple.bind(models),
      getApiKey: (provider) => provider === 'openrouter' ? this.apiKey : undefined,
    });

    await agent.prompt(prompt);
    const lastAssistant = [...agent.state.messages].reverse().find((message): message is AssistantMessage => message.role === 'assistant');
    const text = assistantText(lastAssistant).trim();
    if (!text) throw new Error('Pi Agent returned an empty response.');
    return { text, raw: lastAssistant };
  }
}
