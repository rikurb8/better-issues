export type AgentInvocationStatus = 'succeeded' | 'failed';

export type AgentInvocation = {
  id: string;
  agent: 'pi';
  action: string;
  workflow: string;
  status: AgentInvocationStatus;
  ranAt: string;
  target: {
    kind: 'issue' | 'pull' | 'repo' | 'unknown';
    owner?: string;
    repo?: string;
    number?: number;
    title?: string;
    url?: string;
  };
  summary?: string;
  resultLabel?: string;
  commentUrl?: string | null;
  details?: Record<string, unknown>;
};

const STORAGE_KEY = 'better-issues.agent-invocations.v1';
const MAX_ITEMS = 50;

function isInvocation(value: unknown): value is AgentInvocation {
  return !!value && typeof value === 'object' && typeof (value as AgentInvocation).id === 'string' && typeof (value as AgentInvocation).ranAt === 'string';
}

export function loadAgentInvocations(): AgentInvocation[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isInvocation) : [];
  } catch {
    return [];
  }
}

export function saveAgentInvocations(invocations: AgentInvocation[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invocations.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new CustomEvent('agent-invocations-changed'));
}

export function recordAgentInvocation(invocation: Omit<AgentInvocation, 'id' | 'ranAt'> & { id?: string; ranAt?: string }) {
  const next: AgentInvocation = {
    id: invocation.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    ranAt: invocation.ranAt ?? new Date().toISOString(),
    ...invocation,
  };
  saveAgentInvocations([next, ...loadAgentInvocations().filter((item) => item.id !== next.id)]);
  return next;
}

export function clearAgentInvocations() {
  saveAgentInvocations([]);
}

export async function fetchAgentInvocations(): Promise<AgentInvocation[]> {
  const response = await fetch('/api/agent-invocations?limit=100');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load agent activity.');
  return Array.isArray(payload.invocations) ? payload.invocations : [];
}
