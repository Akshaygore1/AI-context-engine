export interface AnswerResult {
  answer: string;
  confidence: string;
  sourcesUsed: string[];
  mode: string;
  provider: string;
  model: string;
  requestId: string;
}
export interface GenerationSelection { provider: string; model: string }
export interface GenerationOptions {
  defaultSelection: GenerationSelection;
  providers: Array<{ id: string; label: string; models: Array<{ id: string; label: string }> }>;
}
export interface DebugResult {
  intent: string;
  intents: string[];
  selectedContext: Array<{
    id: string;
    label: string;
    source: string;
    priority: string;
  }>;
  excludedContext: Array<{ id: string; label: string; reason: string }>;
  budgetOmissions: Array<{ id: string; label: string; reason: string }>;
  missingContext: Array<{ id: string; label: string; reason: string }>;
  unavailableSources: Array<{ source: string; reason: string }>;
  language: string;
  tone: string;
  maxWords: number;
  reasons: string[];
  confidence: string;
  contextCharacters: number;
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly requestId?: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function postApi<T>(
  path: string,
  payload: { userId: string; question: string; generation?: GenerationSelection },
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error?.message ?? "The request could not be completed.",
      body.error?.requestId,
      body.error?.code,
    );
  return body as T;
}

export async function getApi<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error?.message ?? "The request could not be completed.", body.error?.requestId, body.error?.code);
  return body as T;
}
