export type PiMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type PiRequest = { action: string; messages: PiMessage[]; metadata?: Record<string, unknown> };
export type PiResponse = { text: string; raw?: unknown };

export interface PiAgentClient { run(request: PiRequest): Promise<PiResponse>; }

// Adapter boundary for the real Pi SDK. Replace the dynamic placeholder with the
// official import/auth once SDK docs are available; action files do not change.
export class EnvPiAgentClient implements PiAgentClient {
  constructor(private apiKey = process.env.PI_API_KEY) {}
  async run(request: PiRequest): Promise<PiResponse> {
    if (!this.apiKey) return { text: `[Pi SDK not configured]\n\nAction: ${request.action}\n\n${request.messages.at(-1)?.content ?? ''}` };
    // TODO: import and call the official Pi SDK here.
    return { text: `Pi SDK adapter placeholder for ${request.action}.`, raw: request };
  }
}
