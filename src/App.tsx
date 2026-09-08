import { useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { ApiError, postApi, type AnswerResult, type DebugResult } from "./api";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

const samples = [
  ["Career", "What should I focus on to grow in my career?"],
  ["Relationships", "How can I bring more patience to my relationship?"],
  ["Health", "What routines could support my health and energy?"],
  ["Finance", "How should I approach my financial priorities?"],
  ["Mixed", "How can I balance career growth with my relationship?"],
  ["General", "What themes should I keep in mind right now?"],
];

export default function App() {
  const [userId, setUserId] = useState("user_101");
  const [question, setQuestion] = useState(samples[0][1]);
  const [answer, setAnswer] = useState<AnswerResult>();
  const [debug, setDebug] = useState<DebugResult>();
  const [debuggedAt, setDebuggedAt] = useState("");
  const [pending, setPending] = useState<"answer" | "debug">();
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  const submit = async (kind: "answer" | "debug") => {
    setPending(kind);
    setError(undefined);
    if (kind === "answer") setAnswer(undefined);
    else setDebug(undefined);
    try {
      if (kind === "answer") {
        setAnswer(await postApi<AnswerResult>("/personalize", { userId, question }));
      } else {
        setDebug(await postApi<DebugResult>("/debug/personalization", { userId, question }));
        setDebuggedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (caught) {
      setError({
        message: caught instanceof Error ? caught.message : "Something went wrong.",
        requestId: caught instanceof ApiError ? caught.requestId : undefined,
      });
    } finally {
      setPending(undefined);
    }
  };

  return (
    <main>
      <header>
        <div className="brand"><Sparkles size={17} aria-hidden="true" /> MyNaksh <span>Context Engine</span></div>
        <h1>Personalized guidance,<br />with its context visible.</h1>
        <p>Ask a question, then inspect exactly which profile signals shaped the response.</p>
      </header>
      <div className="workspace">
        <Card className="form-card">
          <CardContent>
            <form onSubmit={(event) => { event.preventDefault(); void submit("answer"); }}>
              <h2>Ask for guidance</h2>
              <label htmlFor="user-id">User ID</label>
              <Input id="user-id" value={userId} aria-invalid={error?.message.includes("userId")} onChange={(event) => setUserId(event.target.value)} />
              <label htmlFor="question">What would you like guidance on?</label>
              <Textarea id="question" rows={5} value={question} aria-invalid={error?.message.includes("question")} onChange={(event) => setQuestion(event.target.value)} />
              <div className="sample-heading">Try a sample question</div>
              <div className="samples" aria-label="Sample questions">
                {samples.map(([label, value]) => (
                  <button type="button" key={label} className="sample" aria-pressed={question === value} onClick={() => setQuestion(value)}>
                    {label}<ArrowRight size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
              {error && (
                <div className="error" role="alert">
                  <strong>We couldn’t complete that request.</strong>
                  <span>{error.message} You can try again.</span>
                  {error.requestId && <small>Request ID: {error.requestId}</small>}
                </div>
              )}
              <div className="actions">
                <Button className="action-button" type="submit" disabled={!!pending}>
                  {pending === "answer" ? "Creating guidance…" : "Get guidance"}
                </Button>
                <Button className="action-button" variant="outline" type="button" onClick={() => void submit("debug")} disabled={!!pending}>
                  <Search data-icon="inline-start" aria-hidden="true" />
                  {pending === "debug" ? "Inspecting…" : "Inspect context"}
                </Button>
              </div>
              <p className="disclosure">Each answer identifies real or mock mode. Confidence measures context coverage. Sources show what was supplied to generation.</p>
            </form>
          </CardContent>
        </Card>
        <div className="results" aria-live="polite" aria-busy={pending === "answer"}>
          {pending === "answer" ? (
            <Card><CardContent className="loading"><span /><span /><span /></CardContent></Card>
          ) : answer ? (
            <Card><CardContent>
              <div className="result-head"><h2>Personalized guidance</h2><span className="mode">{answer.mode} mode</span></div>
              <p className="answer">{answer.answer}</p>
              <div className="metadata">
                <span><strong>{answer.confidence}</strong> context coverage</span>
                <span><strong>Supplied context</strong> {answer.sourcesUsed.join(" · ")}</span>
              </div>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="empty"><Sparkles aria-hidden="true" /><p>Your guidance will appear here.</p><span>Choose a sample or write your own question.</span></CardContent></Card>
          )}
          {debug && (
            <Card><CardContent>
              <div className="result-head">
                <div><h2>Independent context inspection</h2><span className="evaluation-time">Separate evaluation at {debuggedAt} · <strong>{debug.confidence}</strong> context coverage</span></div>
                <span className="mode">{debug.intents.join(" + ")}</span>
              </div>
              <div className="debug-grid">
                <div>
                  <h3>Selected context</h3>
                  {debug.selectedContext.map((item) => <p key={item.id}><strong>{item.label}</strong> · {item.priority}</p>)}
                  {debug.missingContext.length > 0 && <><h3>Missing expected context</h3>{debug.missingContext.map((item) => <p className="limitation" key={item.id}><strong>{item.label}</strong> · {item.reason}</p>)}</>}
                  {debug.budgetOmissions.length > 0 && <><h3>Budget omissions</h3>{debug.budgetOmissions.map((item) => <p key={item.id}><strong>{item.label}</strong> · {item.reason}</p>)}</>}
                </div>
                <div>
                  <h3>Response preferences</h3><p>{debug.language} · {debug.tone} · {debug.maxWords} words</p>
                  <h3>Decision</h3><p>{debug.reasons.join(" ")}</p>
                  {debug.unavailableSources.length > 0 && <><h3>Unavailable services</h3><p className="limitation">{debug.unavailableSources.map((item) => `${item.source}: ${item.reason}`).join(" · ")}</p></>}
                  <h3>Deliberately excluded</h3>
                  {debug.excludedContext.length ? debug.excludedContext.map((item) => <p key={item.id}><strong>{item.label}</strong> · {item.reason}</p>) : <p>None</p>}
                </div>
              </div>
            </CardContent></Card>
          )}
        </div>
      </div>
    </main>
  );
}
