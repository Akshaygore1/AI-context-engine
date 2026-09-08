import { useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { postApi, type AnswerResult, type DebugResult } from "./api";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

export default function App() {
  const [userId, setUserId] = useState("user_101");
  const [question, setQuestion] = useState("What should I focus on to grow in my career?");
  const [answer, setAnswer] = useState<AnswerResult>();
  const [debug, setDebug] = useState<DebugResult>();
  const [pending, setPending] = useState<"answer" | "debug">();
  const [error, setError] = useState("");
  const submit = async (kind: "answer" | "debug") => {
    setPending(kind); setError("");
    try {
      if (kind === "answer") setAnswer(await postApi<AnswerResult>("/api/personalize", { userId, question }));
      else setDebug(await postApi<DebugResult>("/api/debug/personalization", { userId, question }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); }
    finally { setPending(undefined); }
  };
  return <main>
    <header><div className="eyebrow"><Sparkles size={14} /> MyNaksh intelligence layer</div><h1>Ask with context.<br /><em>See why it fits.</em></h1><p>Focused astrological guidance shaped by the parts of your profile that matter to the question.</p></header>
    <div className="workspace">
      <Card className="form-card">
        <div className="section-label">Your question</div>
        <label htmlFor="user-id">User ID</label><Input id="user-id" value={userId} onChange={(event) => setUserId(event.target.value)} />
        <label htmlFor="question">What would you like guidance on?</label><Textarea id="question" rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} />
        <button className="sample" onClick={() => setQuestion("What should I focus on to grow in my career?")}>Try the career example <ArrowRight size={14} /></button>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="actions"><Button onClick={() => submit("answer")} disabled={!!pending}>{pending === "answer" ? "Creating guidance…" : "Get guidance"}</Button><Button className="secondary" onClick={() => submit("debug")} disabled={!!pending}><Search size={16} />{pending === "debug" ? "Inspecting…" : "Inspect context"}</Button></div>
        <p className="disclosure">Demo runs in disclosed mock mode. Confidence measures context coverage; sources are the context supplied to generation.</p>
      </Card>
      <div className="results">
        {answer ? <Card><div className="result-head"><span className="section-label">Personalized guidance</span><span className="mode">{answer.mode} mode</span></div><p className="answer">{answer.answer}</p><div className="metadata"><span><strong>{answer.confidence}</strong> context coverage</span><span>{answer.sourcesUsed.join(" · ")}</span></div></Card> : <Card className="empty"><Sparkles /><p>Your guidance will appear here.</p></Card>}
        {debug && <Card><div className="result-head"><span className="section-label">Independent context inspection</span><span className="mode">{debug.intent}</span></div><div className="debug-grid"><div><small>Selected</small>{debug.selectedContext.map((item) => <p key={item.id}><strong>{item.label}</strong> · {item.priority}</p>)}</div><div><small>Preferences</small><p>{debug.language} · {debug.tone} · {debug.maxWords} words</p><small>Why</small><p>{debug.reasons.join(" ")}</p></div></div></Card>}
      </div>
    </div>
  </main>;
}
