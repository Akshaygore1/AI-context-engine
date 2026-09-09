import { useEffect, useRef, useState } from "react";
import { ArrowUp, Menu, PanelRight, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import { ApiError, getApi, postApi, type AnswerResult, type DebugResult, type GenerationOptions, type GenerationSelection } from "./api";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./components/ui/sheet";
import { Skeleton } from "./components/ui/skeleton";

const samples = [
  "What should I focus on to grow in my career?",
  "How can I bring more patience to my relationship?",
  "What routines could support my health and energy?",
  "How should I approach my financial priorities?",
];

type RequestError = { message: string; requestId?: string };

function SidebarContent({ userId, setUserId, onNew }: { userId: string; setUserId: (value: string) => void; onNew: () => void }) {
  return (
    <div className="sidebar-content">
      <div className="brand"><span className="brand-mark"><Sparkles aria-hidden="true" /></span><span>MyNaksh</span></div>
      <Button variant="outline" className="new-prompt" onClick={onNew}><Plus data-icon="inline-start" aria-hidden="true" />New prompt</Button>
      <div className="sidebar-spacer" />
      <label className="user-label" htmlFor="user-id">User ID</label>
      <input id="user-id" className="user-input" value={userId} onChange={(event) => setUserId(event.target.value)} />
      <p className="disclosure">Single-turn MVP. Answers are generated from selected context and are not guaranteed predictions.</p>
    </div>
  );
}

function InspectorBody({ debug, loading, evaluatedAt }: { debug?: DebugResult; loading: boolean; evaluatedAt: string }) {
  if (loading) return <div className="inspector-loading"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>;
  if (!debug) return <p className="inspector-empty">Inspect a question to see the independent context decision. This request never calls a model.</p>;
  return (
    <div className="inspector-body">
      <div className="inspector-summary"><Badge variant="secondary">{debug.intents.join(" + ")}</Badge><span>Evaluated {evaluatedAt} · {debug.confidence} coverage</span></div>
      <section><h3>Selected context</h3>{debug.selectedContext.map((item) => <p key={item.id}><strong>{item.label}</strong><span>{item.priority}</span></p>)}</section>
      {debug.missingContext.length > 0 && <section><h3>Missing expected context</h3>{debug.missingContext.map((item) => <p className="limitation" key={item.id}><strong>{item.label}</strong><span>{item.reason}</span></p>)}</section>}
      {debug.budgetOmissions.length > 0 && <section><h3>Budget omissions</h3>{debug.budgetOmissions.map((item) => <p key={item.id}><strong>{item.label}</strong><span>{item.reason}</span></p>)}</section>}
      <section><h3>Response preferences</h3><p><strong>{debug.language} · {debug.tone}</strong><span>Up to {debug.maxWords} words</span></p></section>
      <section><h3>Decision reasons</h3><div className="reason-list">{debug.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div></section>
      {debug.unavailableSources.length > 0 && <section><h3>Unavailable services</h3>{debug.unavailableSources.map((item) => <p className="limitation" key={item.source}><strong>{item.source}</strong><span>{item.reason}</span></p>)}</section>}
      <section><h3>Deliberately excluded</h3>{debug.excludedContext.length ? debug.excludedContext.map((item) => <p key={item.id}><strong>{item.label}</strong><span>{item.reason}</span></p>) : <p>None</p>}</section>
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState("user_101");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResult>();
  const [options, setOptions] = useState<GenerationOptions>();
  const [selection, setSelection] = useState<GenerationSelection>();
  const [debug, setDebug] = useState<DebugResult>();
  const [debuggedAt, setDebuggedAt] = useState("");
  const [answerPending, setAnswerPending] = useState(false);
  const [debugPending, setDebugPending] = useState(false);
  const [error, setError] = useState<RequestError>();
  const [optionsError, setOptionsError] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void getApi<GenerationOptions>("/generation/options")
      .then((result) => { setOptions(result); setSelection(result.defaultSelection); })
      .catch(() => setOptionsError(true));
  }, []);

  const selectedProvider = options?.providers.find((provider) => provider.id === selection?.provider);

  const submitAnswer = async (value = question) => {
    const cleanQuestion = value.trim();
    if (!selection || !cleanQuestion || answerPending) return;
    setAnswerPending(true); setError(undefined); setAnswer(undefined); setSubmittedQuestion(cleanQuestion);
    try {
      setAnswer(await postApi<AnswerResult>("/personalize", { userId, question: cleanQuestion, generation: selection }));
      setQuestion("");
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Something went wrong.", requestId: caught instanceof ApiError ? caught.requestId : undefined });
    } finally { setAnswerPending(false); }
  };

  const inspect = async () => {
    const inspectedQuestion = (question.trim() || submittedQuestion).trim();
    setInspectorOpen(true);
    if (!inspectedQuestion || debugPending) return;
    setDebugPending(true); setDebug(undefined);
    try {
      setDebug(await postApi<DebugResult>("/debug/personalization", { userId, question: inspectedQuestion }));
      setDebuggedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Something went wrong.", requestId: caught instanceof ApiError ? caught.requestId : undefined });
    } finally { setDebugPending(false); }
  };

  const newPrompt = () => {
    setQuestion(""); setSubmittedQuestion(""); setAnswer(undefined); setDebug(undefined); setError(undefined); setMenuOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <main className="app-shell">
      <aside className="desktop-sidebar" aria-label="Workspace sidebar"><SidebarContent userId={userId} setUserId={setUserId} onNew={newPrompt} /></aside>
      <div className="main-column">
        <header className="topbar">
          <Button variant="ghost" size="icon" className="mobile-only" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" /></Button>
          <div className="generation-controls" aria-label="Generation settings">
            <Select value={selection?.provider ?? ""} onValueChange={(provider) => {
              const next = options?.providers.find((item) => item.id === provider);
              if (provider && next) setSelection({ provider, model: next.models[0].id });
            }} disabled={!options}>
              <SelectTrigger aria-label="Provider"><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent align="start"><SelectGroup>{options?.providers.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Select value={selection?.model ?? ""} onValueChange={(model) => model && selection && setSelection({ ...selection, model })} disabled={!selectedProvider}>
              <SelectTrigger className="model-trigger" aria-label="Model"><SelectValue placeholder="Model" /></SelectTrigger>
              <SelectContent align="start"><SelectGroup>{selectedProvider?.models.map((model) => <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {options?.providers.length === 1 && <Badge variant="outline" className="mock-only">Mock only</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => void inspect()} disabled={debugPending || (!question.trim() && !submittedQuestion)}><PanelRight data-icon="inline-start" aria-hidden="true" />Inspect</Button>
        </header>

        <div className="conversation" aria-live="polite" aria-busy={answerPending}>
          {!submittedQuestion && !answerPending ? (
            <div className="empty-state">
              <span className="empty-mark"><Sparkles aria-hidden="true" /></span>
              <h1>How can I help you reflect?</h1>
              <p>Ask for personalized guidance, then inspect the exact context behind it.</p>
              <div className="sample-prompts">{samples.map((sample) => <button key={sample} onClick={() => { setQuestion(sample); textareaRef.current?.focus(); }}>{sample}<ArrowUp aria-hidden="true" /></button>)}</div>
            </div>
          ) : (
            <div className="transcript">
              <div className="user-message"><span>You</span><p>{submittedQuestion}</p></div>
              <div className="assistant-message">
                <div className="assistant-label"><span className="assistant-mark"><Sparkles aria-hidden="true" /></span><strong>MyNaksh</strong></div>
                {answerPending ? <div className="answer-loading"><Skeleton /><Skeleton /><Skeleton /></div> : answer ? <><p className="answer-text">{answer.answer}</p><div className="answer-meta"><Badge variant="secondary">{answer.confidence} confidence</Badge><span>{answer.provider} · {answer.model}</span><span>{answer.mode} mode</span><span>Sources supplied: {answer.sourcesUsed.join(" · ")}</span></div></> : null}
              </div>
            </div>
          )}
        </div>

        <div className="composer-region">
          {optionsError && <Alert variant="destructive"><AlertTitle>Generation options unavailable</AlertTitle><AlertDescription>Refresh the page after the server is available.</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertTitle>We couldn’t complete that request.</AlertTitle><AlertDescription>{error.message}{error.requestId && <small> Request ID: {error.requestId}</small>}</AlertDescription><Button variant="ghost" size="sm" onClick={() => void submitAnswer(submittedQuestion || question)}><RefreshCw data-icon="inline-start" aria-hidden="true" />Retry</Button></Alert>}
          <form className="composer" onSubmit={(event) => { event.preventDefault(); void submitAnswer(); }}>
            <label className="sr-only" htmlFor="question">Message</label>
            <textarea ref={textareaRef} id="question" rows={1} value={question} placeholder="Ask for guidance" maxLength={2000} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitAnswer(); } }} />
            <Button type="submit" size="icon" aria-label="Send message" disabled={!selection || !question.trim() || answerPending}><ArrowUp aria-hidden="true" /></Button>
          </form>
          <p className="composer-note">Enter to send · Shift+Enter for a new line</p>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="left" className="mobile-menu"><SheetHeader className="sr-only"><SheetTitle>Workspace navigation</SheetTitle><SheetDescription>Start a prompt or change the current user.</SheetDescription></SheetHeader><SidebarContent userId={userId} setUserId={setUserId} onNew={newPrompt} /></SheetContent></Sheet>
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}><SheetContent side="right" className="inspector"><SheetHeader><SheetTitle>Context inspection</SheetTitle><SheetDescription>Independent personalization evaluation. No generation call is made.</SheetDescription></SheetHeader><Separator /><InspectorBody debug={debug} loading={debugPending} evaluatedAt={debuggedAt} /></SheetContent></Sheet>
    </main>
  );
}
