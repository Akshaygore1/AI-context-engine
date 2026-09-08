export interface AnswerResult { answer: string; confidence: string; sourcesUsed: string[]; mode: string; requestId: string }
export interface DebugResult { intent: string; intents: string[]; selectedContext: Array<{ id: string; label: string; source: string; priority: string }>; excludedContext: Array<{ id: string; label: string; reason: string }>; budgetOmissions: Array<{ id: string; label: string; reason: string }>; missingContext: Array<{ id: string; label: string; reason: string }>; unavailableSources: Array<{ source: string; reason: string }>; language: string; tone: string; maxWords: number; reasons: string[]; confidence: string; contextCharacters: number; requestId: string }

export async function postApi<T>(path: string, payload: { userId: string; question: string }): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "The request could not be completed.");
  return body as T;
}
