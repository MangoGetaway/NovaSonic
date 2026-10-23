import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight, ArrowUp, Check, ChevronDown, CircleAlert, Command, Cpu, HardDrive,
  LayoutGrid, Menu, MessageSquareText, Moon, Plus, RefreshCw, Search, Settings2,
  ShieldCheck, Sparkles, Square, Sun, Trash2, WandSparkles, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { backend } from "./lib/backend";
import type { ChatMessage, Conversation, LocalModel } from "./types";

type Page = "home" | "chat" | "models" | "settings";
type Theme = "dark" | "light";
type RequestState = { requestId: string; conversationId: string; text: string } | null;

const SUGGESTIONS = [
  { icon: "✦", title: "Explore an idea", prompt: "Help me brainstorm and structure a new project idea." },
  { icon: "⌘", title: "Write something", prompt: "Help me write a concise, professional project proposal." },
  { icon: "◇", title: "Solve a problem", prompt: "Help me break down a challenging problem step by step." },
  { icon: "↗", title: "Plan my day", prompt: "Help me prioritize tasks and create a focused plan for today." }
];

function Mark({ small = false }: { small?: boolean }) {
  return <span className={small ? "brand-mark small" : "brand-mark"} aria-hidden="true"><span /></span>;
}

function providerLabel(provider: LocalModel["provider"]) {
  return ({ ollama: "Ollama", lmstudio: "LM Studio", llamacpp: "llama.cpp" } as const)[provider];
}

function friendlyError(error: unknown) {
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : "Unexpected local error";
  return raw.length > 280 ? raw.slice(0, 280) + "…" : raw;
}

function Message({ message }: { message: Pick<ChatMessage, "role" | "content"> }) {
  return <article className={message.role === "user" ? "message user-message" : "message assistant-message"}>
    <div className="message-avatar" aria-hidden="true">{message.role === "assistant" ? <Mark small /> : "Y"}</div>
    <div className="message-content">
      <div className="message-speaker">{message.role === "assistant" ? "NovaSonic" : "You"}</div>
      {message.role === "assistant"
        ? <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
        : <p className="user-text">{message.content}</p>}
    </div>
  </article>;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem("novasonic-theme") === "light" ? "light" : "dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState<RequestState>(null);
  const [busy, setBusy] = useState(false);
  const [discovering, setDiscovering] = useState(true);
  const [eventsReady, setEventsReady] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<RequestState>(null);
  const activeRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((chat) => chat.id === activeId);
  const currentKey = activeConversation?.model_key ?? selectedKey;
  const currentModel = models.find((model) => model.key === currentKey);
  const inProgress = Boolean(request);
  const filtered = conversations.filter((chat) => chat.title.toLowerCase().includes(search.toLowerCase()));

  const refreshChats = useCallback(async () => {
    setConversations(await backend.conversations());
  }, []);
  const refreshModels = useCallback(async () => {
    setDiscovering(true);
    try {
      const found = await backend.discover();
      setModels(found);
      setSelectedKey((key) => found.some((item) => item.key === key) ? key : found[0]?.key ?? "");
      setError("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setDiscovering(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("novasonic-theme", theme);
  }, [theme]);

  useEffect(() => {
    let disposed = false;
    let offDelta: (() => void) | undefined;
    let offFinished: (() => void) | undefined;
    (async () => {
      try {
        [offDelta, offFinished] = await Promise.all([
          backend.onDelta((event) => {
            if (requestRef.current?.requestId !== event.request_id) return;
            setRequest((current) => current?.requestId === event.request_id
              ? { ...current, text: current.text + event.text } : current);
          }),
          backend.onFinished((event) => {
            if (requestRef.current?.requestId !== event.request_id) return;
            requestRef.current = null;
            setRequest(null);
            if (event.error && event.error !== "Cancelled") setError(event.error);
            if (activeRef.current === requestRefConversation.current) {
              void backend.messages(requestRefConversation.current).then(setMessages).catch((e) => setError(friendlyError(e)));
            }
            void refreshChats().catch((e) => setError(friendlyError(e)));
            requestRefConversation.current = "";
          })
        ]);
        if (disposed) { offDelta?.(); offFinished?.(); return; }
        setEventsReady(true);
      } catch (err) {
        if (!disposed) setError("Desktop event bridge unavailable: " + friendlyError(err));
      }
    })();
    void refreshModels();
    void refreshChats().catch((err) => setError("Could not load local history: " + friendlyError(err)));
    return () => { disposed = true; offDelta?.(); offFinished?.(); };
  }, [refreshChats, refreshModels]);

  // A stable ref prevents a completion for a previous chat from overwriting the active view.
  const requestRefConversation = useRef("");
  useEffect(() => { activeRef.current = activeId; }, [activeId]);
  useEffect(() => { requestRef.current = request; }, [request]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, request?.text]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch("");
        setActiveId(null);
        setPage("home");
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && page === "models") setPage(activeId ? "chat" : "home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, activeId]);

  async function openChat(id: string) {
    setError("");
    setActiveId(id);
    setPage("chat");
    setMessages([]);
    try {
      setMessages(await backend.messages(id));
    } catch (err) { setError(friendlyError(err)); }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setDraft("");
    setError("");
    setPage("home");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function removeChat(id: string) {
    if (requestRef.current?.conversationId === id) await cancel();
    try {
      await backend.remove(id);
      if (activeId === id) newChat();
      await refreshChats();
    } catch (err) { setError(friendlyError(err)); }
  }

  async function cancel() {
    const current = requestRef.current;
    if (!current) return;
    try { await backend.cancel(current.requestId); }
    catch (err) { setError(friendlyError(err)); }
  }

  async function send(value = draft) {
    const text = value.trim();
    if (!text || busy || requestRef.current || !eventsReady) return;
    if (!currentKey || !models.some((model) => model.key === currentKey)) {
      setError("No local model is available. Start a compatible local server and refresh models.");
      setPage("models");
      return;
    }
    setBusy(true);
    setError("");
    setDraft("");
    try {
      let conversationId = activeId;
      if (!conversationId) {
        const conversation = await backend.create(currentKey);
        conversationId = conversation.id;
        setActiveId(conversationId);
        activeRef.current = conversationId;
        setPage("chat");
        setConversations((current) => [conversation, ...current]);
        setMessages([]);
      }
      const userMessage = await backend.appendUser(conversationId, text);
      setMessages((current) => [...current, userMessage]);
      const requestId = crypto.randomUUID();
      const state = { requestId, conversationId, text: "" };
      requestRef.current = state;
      requestRefConversation.current = conversationId;
      setRequest(state);
      await backend.start(conversationId, currentKey, requestId);
      await refreshChats();
    } catch (err) {
      requestRef.current = null;
      setRequest(null);
      setDraft(text);
      setError(friendlyError(err));
    } finally { setBusy(false); }
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  function changeModel(value: string) {
    if (inProgress || busy) return;
    setSelectedKey(value);
    if (activeId && activeConversation?.model_key !== value) newChat();
  }

  return <div className="app-shell">
    {sidebarOpen && <aside className="sidebar" aria-label="Application navigation">
      <button className="brand lockup" onClick={newChat} aria-label="NovaSonic home">
        <Mark /><span className="brand-word">nova<span>sonic</span><small>PERSONAL INTELLIGENCE</small></span>
      </button>
      <button className="new-chat" onClick={newChat}><Plus size={18} /> New conversation <span className="shortcut">⌘K</span></button>
      <nav className="primary-nav" aria-label="Primary">
        <button className={page === "home" ? "nav-item active" : "nav-item"} onClick={() => { setPage("home"); setActiveId(null); }}><LayoutGrid size={18}/> Overview</button>
        <button className={page === "models" ? "nav-item active" : "nav-item"} onClick={() => setPage("models")}><Cpu size={18}/> Model Hub <span className="nav-count">{models.length}</span></button>
      </nav>
      <div className="history-heading">YOUR CONVERSATIONS <span>{conversations.length}</span></div>
      <label className="search-box"><Search size={16}/><input placeholder="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search conversations" /></label>
      <div className="chat-history">
        {filtered.length === 0
          ? <p className="history-empty">{search ? "No matching conversations." : "Your conversations will appear here."}</p>
          : filtered.map((chat) => <div key={chat.id} className={activeId === chat.id && page === "chat" ? "history-row selected" : "history-row"}>
              <button className="history-open" title={chat.title} onClick={() => void openChat(chat.id)}><MessageSquareText size={16}/><span>{chat.title}</span></button>
              <button className="icon-button delete-chat" title="Delete conversation" aria-label={`Delete ${chat.title}`} onClick={() => void removeChat(chat.id)}><Trash2 size={15}/></button>
            </div>)}
      </div>
      <div className="sidebar-footer">
        <div className="privacy-mini"><ShieldCheck size={17}/><div><strong>Private by design</strong><small>Inference stays on your machine</small></div><span className="status-dot"/></div>
        <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => setPage("settings")}><Settings2 size={18}/> Settings</button>
      </div>
    </aside>}

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}><Menu size={20}/></button><span className="breadcrumb">Workspace <span>/</span> <strong>{page === "chat" ? activeConversation?.title ?? "Conversation" : page === "models" ? "Model Hub" : page === "settings" ? "Settings" : "Overview"}</strong></span></div>
        <div className="topbar-right">
          <span className="local-indicator"><span className="status-dot"/> LOCAL MODE</span>
          <div className="select-wrap"><Cpu size={16}/><select value={currentKey} onChange={(e) => changeModel(e.target.value)} disabled={busy || inProgress || models.length === 0} aria-label="Select local model">{models.length === 0 ? <option value="">No local models</option> : models.map((model) => <option key={model.key} value={model.key}>{model.label} · {providerLabel(model.provider)}</option>)}</select><ChevronDown size={14}/></div>
          <button className="icon-button theme-toggle" title="Toggle theme" aria-label="Toggle light or dark theme" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
        </div>
      </header>

      {error && <div className="error-banner" role="alert"><CircleAlert size={18}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16}/></button></div>}

      {page === "home" && <div className="home-view">
        <div className="hero">
          <div className="eyebrow"><Sparkles size={14}/> YOUR PRIVATE AI WORKSPACE</div>
          <div className="hero-emblem"><Mark /></div>
          <h1>Intelligence, <em>entirely yours.</em></h1>
          <p>Your ideas deserve a space of their own. Think, create, and explore with powerful AI that runs right on your computer.</p>
          <div className="hero-stats"><span><ShieldCheck size={15}/> 100% local connections</span><span className="stat-divider"/><span><Cpu size={15}/> {models.length} models detected</span></div>
        </div>
        <div className="suggestion-header"><span>JUMP RIGHT IN</span><small>Not sure where to start?</small></div>
        <div className="suggestion-grid">{SUGGESTIONS.map((idea) => <button key={idea.title} className="suggestion-card" onClick={() => { setDraft(idea.prompt); inputRef.current?.focus(); }}><span className="suggestion-icon">{idea.icon}</span><strong>{idea.title}</strong><ArrowRight size={17}/></button>)}</div>
        {models.length === 0 && !discovering && <button className="discovery-callout" onClick={() => setPage("models")}><CircleAlert size={20}/><span><strong>No local models detected</strong><small>Start Ollama, LM Studio, or llama.cpp to connect an installed model.</small></span><ArrowRight size={18}/></button>}
        <Composer value={draft} onChange={setDraft} onKeyDown={onComposerKey} inputRef={inputRef} onSubmit={() => void send()} onCancel={() => void cancel()} processing={busy || inProgress} canSend={eventsReady && models.length > 0} modelLabel={currentModel?.label} />
      </div>}

      {page === "chat" && <div className="chat-view">
        <div className="chat-scroll">
          <div className="chat-column">
            <div className="conversation-intro"><div className="eyebrow">CONVERSATION</div><h2>{activeConversation?.title ?? "New conversation"}</h2><span><ShieldCheck size={14}/> Private · Stored locally</span></div>
            {messages.map((message) => <Message message={message} key={message.id}/>)}
            {request && request.conversationId === activeId && <article className="message assistant-message"><div className="message-avatar"><Mark small/></div><div className="message-content"><div className="message-speaker">NovaSonic <span className="generating">generating</span></div>{request.text ? <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{request.text}</ReactMarkdown></div> : <div className="typing"><span/><span/><span/></div>}</div></article>}
            <div ref={endRef} />
          </div>
        </div>
        <Composer value={draft} onChange={setDraft} onKeyDown={onComposerKey} inputRef={inputRef} onSubmit={() => void send()} onCancel={() => void cancel()} processing={busy || inProgress} canSend={eventsReady && models.length > 0} modelLabel={currentModel?.label} />
      </div>}

      {page === "models" && <div className="inner-page model-page">
        <div className="page-eyebrow">MODEL MANAGEMENT</div><div className="page-heading"><div><h1>Your model universe.</h1><p>Find and connect with AI models already running on your device.</p></div><button className="secondary-action" onClick={() => void refreshModels()} disabled={discovering}><RefreshCw size={16} className={discovering ? "spin" : ""}/> Refresh models</button></div>
        <div className="model-summary"><div><Cpu size={21}/><strong>{models.length}</strong><span>Available models</span></div><div><HardDrive size={21}/><strong>{new Set(models.map((m) => m.provider)).size}</strong><span>Connected runtimes</span></div><div><ShieldCheck size={21}/><strong>Local</strong><span>Connection policy</span></div></div>
        <div className="section-heading">DISCOVERED MODELS <small>LIVE LOCAL SCAN</small></div>
        {discovering ? <div className="empty-models"><RefreshCw className="spin"/><strong>Scanning local runtimes…</strong></div>
          : models.length ? <div className="model-list">{models.map((model) => <button key={model.key} className={currentKey === model.key ? "model-card chosen" : "model-card"} onClick={() => { changeModel(model.key); if (activeId) newChat(); setPage("home"); }}><div className="model-icon"><Cpu size={21}/></div><span><strong>{model.label}</strong><small>{providerLabel(model.provider)} · {model.id}</small></span><div className="model-card-end"><span className="ready-label"><span className="status-dot"/> Available</span>{currentKey === model.key && <Check size={19}/>}</div></button>)}</div>
          : <div className="empty-models"><Cpu size={29}/><strong>No available models found</strong><p>NovaSonic checks Ollama at 11434, LM Studio at 1234, and llama.cpp at 8080. Launch a local server and try again.</p><button className="secondary-action" onClick={() => void refreshModels()}><RefreshCw size={16}/> Scan again</button></div>}
        <div className="runtime-help"><h3>Connect an existing runtime</h3><div className="runtime-grid"><div><strong>Ollama</strong><code>127.0.0.1:11434</code><small>Start Ollama with an installed model.</small></div><div><strong>LM Studio</strong><code>127.0.0.1:1234</code><small>Enable the Developer local server.</small></div><div><strong>llama.cpp</strong><code>127.0.0.1:8080</code><small>Run llama-server with a model file.</small></div></div></div>
      </div>}

      {page === "settings" && <div className="inner-page settings-page"><div className="page-eyebrow">PREFERENCES</div><div className="page-heading"><div><h1>Make it yours.</h1><p>Simple controls, transparent data boundaries.</p></div></div>
        <section className="settings-section"><h2>Appearance</h2><div className="setting-row"><div><strong>Color theme</strong><small>Choose a comfortable working environment.</small></div><div className="segmented"><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Moon size={15}/> Dark</button><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Sun size={15}/> Light</button></div></div></section>
        <section className="settings-section"><h2>Privacy &amp; data</h2><div className="setting-row"><div><strong>Local inference only</strong><small>All NovaSonic inference connections are restricted to loopback.</small></div><span className="setting-value"><ShieldCheck size={16}/> Enforced</span></div><div className="setting-row"><div><strong>Local conversation history</strong><small>Saved to SQLite in your OS application data directory.</small></div><span className="setting-value">Enabled</span></div><div className="setting-row"><div><strong>Telemetry and cloud sync</strong><small>No background analytics, account or hosted fallback.</small></div><span className="setting-value">Off</span></div></section>
        <div className="about-app"><Mark small/><span><strong>NovaSonic</strong><small>Alpha 0.1 · Your intelligence, entirely yours.</small></span></div>
      </div>}
    </main>
  </div>;
}

function Composer({ value, onChange, onKeyDown, inputRef, onSubmit, onCancel, processing, canSend, modelLabel }: {
  value: string; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>; onSubmit: () => void; onCancel: () => void; processing: boolean; canSend: boolean; modelLabel?: string;
}) {
  return <div className="composer-wrap"><div className="composer">
    <textarea ref={inputRef} value={value} rows={2} placeholder="Ask anything. Your thoughts stay here…" onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} aria-label="Message NovaSonic" disabled={!canSend && !processing} />
    <div className="composer-bottom"><span><WandSparkles size={16}/> {modelLabel || "Select a local model"} <ChevronDown size={13}/></span><div className="composer-actions"><span>Enter to send · Shift+Enter for new line</span><button className="send-button" aria-label={processing ? "Stop generation" : "Send message"} onClick={processing ? onCancel : onSubmit} disabled={!processing && (!canSend || !value.trim())}>{processing ? <Square size={16} fill="currentColor"/> : <ArrowUp size={19}/>}</button></div></div>
  </div><div className="composer-footnote"><ShieldCheck size={13}/> NovaSonic works with local models. Your conversation never needs the cloud. <Command size={13}/></div></div>;
}
