"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Archive, ArrowDownToLine, ArrowRight, Blocks, Check, ChevronDown, CircleHelp, Code2, Eye, FileCode2, FolderKanban, Globe2, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Mail, Monitor, MoreHorizontal, PanelLeftClose, Plus, Rocket, Save, Search, ShieldCheck, Sparkles, Smartphone, Trash2, X, Zap } from "lucide-react";
import JSZip from "jszip";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { enforcePreviewPolicy, isSafeGeneratedFilePath } from "@/lib/generation/security";

type Project = { id: string; title: string; prompt: string; html: string; files: Array<{ path: string; content: string }>; updated_at: string; local?: boolean };
type GeneratedProject = { name: string; summary: string; html: string; files: Array<{ path: string; content: string }> };
type Template = { id: string; title: string; description: string; kind: "landing" | "dashboard" | "portfolio"; icon: typeof Globe2; tag: string };
const TEMPLATES: Template[] = [
  { id: "landing", title: "Product landing page", description: "A crisp launch page with a clear call to action.", kind: "landing", icon: Globe2, tag: "WEBSITE" },
  { id: "dashboard", title: "Analytics dashboard", description: "A focused overview with metrics, trends and actions.", kind: "dashboard", icon: LayoutDashboard, tag: "DASHBOARD" },
  { id: "portfolio", title: "Personal portfolio", description: "A distinctive portfolio for your next opportunity.", kind: "portfolio", icon: Blocks, tag: "PORTFOLIO" },
];
const EXAMPLE_PROMPTS = [
  "Build a modern booking website for a boutique hotel with room cards and date selection",
  "Create a clean expense tracker with a monthly budget and working category filters",
  "Design a premium portfolio for a product designer with projects and contact form",
];

function makeStarterHtml(kind: Template["kind"]) {
  const title = kind === "landing" ? "Northstar — Make room for your next idea" : kind === "dashboard" ? "Pulse — Workspace" : "Alex Morgan — Independent designer";
  const css = "*{box-sizing:border-box}body{margin:0;background:#fff;color:#111116;font:15px/1.55 Inter,system-ui,sans-serif}nav{display:flex;align-items:center;justify-content:space-between;padding:22px 7%;border-bottom:1px solid #eeeef2}.brand{font-weight:850;letter-spacing:-1px;font-size:20px}.accent{color:#5145e5}nav a{color:#565565;text-decoration:none;font-size:13px;margin-left:22px}.btn{border:0;border-radius:999px;padding:12px 18px;background:#5145e5;color:white;cursor:pointer;font-weight:750}.wrap{max-width:1050px;margin:0 auto;padding:78px 7%}.eyebrow{color:#5145e5;font-size:11px;font-weight:850;letter-spacing:1px;text-transform:uppercase}.hero-title{font-size:clamp(42px,7vw,76px);line-height:1.03;letter-spacing:-4px;max-width:790px;margin:20px 0}.lead{color:#777585;max-width:540px;font-size:17px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin:24px 0}.card{border:1px solid #e9e9ef;background:#fff;border-radius:12px;padding:17px}.muted{color:#858594}.big{font-size:29px;font-weight:800;letter-spacing:-1px;margin:10px 0}.tag{display:inline-block;background:#f0efff;color:#5145e5;padding:4px 7px;border-radius:5px;font-size:10px;font-weight:800}.section{padding-top:35px}.section h2{letter-spacing:-1px}.bar{height:80px;background:linear-gradient(180deg,#8b83fa,#5145e5);border-radius:5px;flex:1}.bars{display:flex;align-items:end;gap:8px;height:110px;margin-top:16px}.row{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #eeeef4;padding:12px 0;font-size:12px}.project-card{border:1px solid #e9e9ef;border-radius:12px;padding:19px;min-height:115px}.project-card h3{font-size:15px}.status{margin-top:18px;padding:13px;border-radius:8px;background:#f0efff;color:#5145e5;font-size:12px;display:none}@media(max-width:600px){.grid{grid-template-columns:1fr}.wrap{padding:50px 6%}.hero-title{letter-spacing:-2px}nav a{margin-left:8px;font-size:11px}}";
  const head = "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'\"><title>" + title + "</title><style>" + css + "</style></head><body>";
  if (kind === "landing") {
    return head + "<nav><div class='brand'>northstar<span class='accent'>.</span></div><div><a href='#approach'>Approach</a><a href='#proof'>Why Northstar</a><button class='btn' id='cta'>Get started ↗</button></div></nav><main class='wrap'><div class='eyebrow'>✦ A clearer way forward</div><h1 class='hero-title'>Good ideas deserve <span class='accent'>great momentum.</span></h1><p class='lead'>One thoughtful workspace to turn the things you imagine into the things you make.</p><button class='btn' id='hero'>Explore what's possible ↗</button><p class='muted' id='status'>No noise. Just progress.</p><section class='grid section' id='proof'><article class='card'><div class='big'>01</div><span class='muted'>Make space to think</span></article><article class='card'><div class='big'>02</div><span class='muted'>Build with intention</span></article><article class='card'><div class='big'>03</div><span class='muted'>Move ideas forward</span></article></section></main><script>document.querySelectorAll('#cta,#hero').forEach(function(b){b.addEventListener('click',function(){document.getElementById('status').textContent='Your next chapter starts here.'})})</script></body></html>";
  }
  if (kind === "dashboard") {
    return head + "<nav><div class='brand'>pulse<span class='accent'>.</span></div><a href='#activity'>Activity</a><button class='btn' id='new'>+ New report</button></nav><main class='wrap'><div class='eyebrow'>WORKSPACE OVERVIEW</div><h1 style='font-size:32px;letter-spacing:-1.5px'>Good morning, Alex</h1><p class='muted'>Here is what's happening with your workspace.</p><section class='grid'><article class='card'><span class='muted'>Total visitors</span><div class='big'>24,892</div><span class='tag'>↑ 12.8%</span></article><article class='card'><span class='muted'>Conversion rate</span><div class='big'>3.64%</div><span class='tag'>↑ 0.6%</span></article><article class='card'><span class='muted'>Avg. session</span><div class='big'>2m 48s</div><span class='tag'>↑ 4.2%</span></article></section><section class='card'><div class='row'><strong>Traffic overview</strong><select id='period'><option value='7'>Last 7 days</option><option value='14'>Last 14 days</option></select></div><div class='bars' id='bars'></div></section><section class='section' id='activity'><h2>Recent activity</h2><div id='rows'><div class='row'><span>Landing page published</span><span class='tag'>Complete</span></div><div class='row'><span>Weekly report created</span><span class='tag'>Ready</span></div><div class='row'><span>Audience synced</span><span class='tag'>Complete</span></div></div></section></main><script>function draw(n){var el=document.getElementById('bars');el.innerHTML='';for(var i=0;i<n;i++){var b=document.createElement('div');b.className='bar';b.style.height=(25+Math.abs(Math.sin(i*1.31))*75)+'%';el.appendChild(b)}}draw(7);document.getElementById('period').addEventListener('change',function(e){draw(Number(e.target.value))});document.getElementById('new').addEventListener('click',function(){var r=document.createElement('div');r.className='row';r.innerHTML='<span>New report created</span><span class=&quot;tag&quot;>Draft</span>';document.getElementById('rows').prepend(r)})</script></body></html>";
  }
  return head + "<nav><div class='brand'>alex morgan<span class='accent'>.</span></div><div><a href='#work'>Work</a><a href='#about'>About</a><a href='#contact'>Contact</a></div></nav><main class='wrap'><div class='eyebrow'>Independent designer · Available for select projects</div><h1 class='hero-title'>Making digital feel a little more <span class='accent'>human.</span></h1><p class='lead'>I partner with ambitious teams to turn complex ideas into clear, considered digital experiences.</p><button class='btn' id='contact-btn'>Let's talk ↗</button><section class='section' id='work'><div class='eyebrow'>Selected work · 2024—26</div><h2>A few things I've helped bring to life.</h2><div class='grid' style='grid-template-columns:repeat(2,minmax(0,1fr))'><article class='project-card'><span class='tag'>PRODUCT DESIGN</span><h3>Forma — Everyday finance</h3><p class='muted'>A calmer way to understand and manage money.</p></article><article class='project-card'><span class='tag'>BRAND & DIGITAL</span><h3>Fieldnotes — Creative tools</h3><p class='muted'>A thoughtful identity for people who make things.</p></article><article class='project-card'><span class='tag'>STRATEGY</span><h3>Common Ground</h3><p class='muted'>Making room for better conversations.</p></article><article class='project-card'><span class='tag'>WEB EXPERIENCE</span><h3>Stillwell — Wellbeing</h3><p class='muted'>Small rituals for a more intentional day.</p></article></div></section><section class='section' id='about'><div class='eyebrow'>A little about me</div><h2>Curious by nature. Careful by design.</h2><p class='lead'>I care about the details people notice—and the ones they don't.</p></section><div class='status' id='contact'>Thanks for reaching out. This starter shows where a contact workflow can connect.</div></main><script>document.getElementById('contact-btn').addEventListener('click',function(){var e=document.getElementById('contact');e.style.display='block';e.scrollIntoView({behavior:'smooth'})})</script></body></html>";
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}
function starterFiles(html: string) { return [{ path: "index.html", content: html }]; }
function formatDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Just now" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d); }

function createPreviewDocument(source: string): string {
  const safeHtml = enforcePreviewPolicy(source);
  // This small in-frame reporter observes JavaScript failures only; generated
  // code still runs in an opaque-origin iframe with network access blocked by CSP.
  const reporter = "<script>(function(){function report(message){try{parent.postMessage({type:'blink-preview-runtime-error',message:String(message).slice(0,240)},'*')}catch{}}window.addEventListener('error',function(event){report(event.message||'Script error')});window.addEventListener('unhandledrejection',function(event){var reason=event.reason;report(reason&&reason.message?reason.message:reason||'Unhandled promise rejection')})})();</script>";
  const headClose = safeHtml.toLowerCase().indexOf("</head>");
  return headClose >= 0
    ? safeHtml.slice(0, headClose) + reporter + safeHtml.slice(headClose)
    : safeHtml;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewRuntimeError, setPreviewRuntimeError] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [codeDraft, setCodeDraft] = useState("");
  const [activeFilePath, setActiveFilePath] = useState("index.html");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectQuery, setProjectQuery] = useState("");
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [generationReady, setGenerationReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const saveLocalProjects = useCallback((next: Project[]) => {
    setProjects(next);
    try { localStorage.setItem("blink.localProjects", JSON.stringify(next.filter((p) => p.local))); } catch { /* storage may be disabled */ }
  }, []);

  const loadProjects = useCallback(async (currentUser: User | null) => {
    if (supabase && currentUser) {
      setLoadingProjects(true);
      const { data, error } = await supabase.from("projects").select("id,title,prompt,html,files,updated_at").order("updated_at", { ascending: false }).limit(50);
      if (!error && data) {
        const cloud: Project[] = data.map((row) => ({ id: row.id, title: row.title, prompt: row.prompt, html: row.html, files: Array.isArray(row.files) ? row.files as Project["files"] : [], updated_at: row.updated_at, local: false }));
        let localProjects: Project[] = [];
        try {
          const raw = localStorage.getItem("blink.localProjects");
          const parsedLocal = raw ? JSON.parse(raw) as Project[] : [];
          if (Array.isArray(parsedLocal)) localProjects = parsedLocal.filter((p) => p && p.local && typeof p.id === "string" && typeof p.html === "string");
        } catch { localProjects = []; }
        const combined = [...cloud, ...localProjects.filter((p) => !cloud.some((row) => row.id === p.id))].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setProjects(combined);
        setActiveProject((current) => current && combined.some((p) => p.id === current.id) ? combined.find((p) => p.id === current.id) || null : null);
      } else {
        setMessage({ kind: "error", text: "Could not load cloud projects. Check your Supabase schema and row-level security policies." });
      }
      setLoadingProjects(false);
      return;
    }
    try {
      const raw = localStorage.getItem("blink.localProjects");
      const local = raw ? JSON.parse(raw) as Project[] : [];
      setProjects(Array.isArray(local) ? local.filter((p) => p && typeof p.id === "string" && typeof p.html === "string") : []);
    } catch { setProjects([]); }
  }, [supabase]);

  useEffect(() => {
    setBackendConfigured(isSupabaseConfigured());
    fetch("/api/health", { cache: "no-store" }).then((r) => r.json()).then((d) => setGenerationReady(d.status === "ready")).catch(() => setGenerationReady(false));
    if (!supabase) {
      setAuthInitializing(false);
      void loadProjects(null);
      return;
    }
    supabase.auth.getUser()
      .then(({ data }) => { setUser(data.user); void loadProjects(data.user); })
      .catch(() => { setUser(null); void loadProjects(null); })
      .finally(() => setAuthInitializing(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user || null;
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setPassword("");
        setMessage({ kind: "info", text: "Choose a new password to secure your BLINK account." });
      } else if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setRecoveryMode(false);
      }
      setUser(nextUser);
      setAuthInitializing(false);
      void loadProjects(nextUser);
    });
    return () => subscription.unsubscribe();
  }, [loadProjects, supabase]);

  const visibleProjects = useMemo(() => {
    const term = projectQuery.trim().toLowerCase();
    return projects.filter((p) => !term || p.title.toLowerCase().includes(term)).slice(0, 12);
  }, [projects, projectQuery]);

  useEffect(() => {
    function receivePreviewMessage(event: MessageEvent) {
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      const payload = event.data as { type?: unknown; message?: unknown } | null;
      if (!payload || typeof payload !== "object" || payload.type !== "blink-preview-runtime-error" || typeof payload.message !== "string") return;
      setPreviewRuntimeError(payload.message.slice(0, 240));
    }
    window.addEventListener("message", receivePreviewMessage);
    return () => window.removeEventListener("message", receivePreviewMessage);
  }, []);

  function resetWorkspace() { setPrompt(""); setActiveProject(null); setActiveTab("preview"); setMessage(null); requestAnimationFrame(() => textareaRef.current?.focus()); }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage({ kind: "error", text: "Authentication is not configured. Add the Supabase URL and public key, then restart the app." }); return; }
    setAuthBusy(true); setMessage(null);
    try {
      const result = authMode === "signup" ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session) {
        setMessage({ kind: "info", text: "Account created. Check your email if confirmation is enabled in Supabase, then sign in." });
      } else {
        setUser(result.data.user);
        setAuthOpen(false);
        setPassword("");
        setMessage({ kind: "success", text: authMode === "signup" ? "Your BLINK account is ready." : "Welcome back." });
        void loadProjects(result.data.user);
      }
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Authentication failed. Please retry." }); }
    finally { setAuthBusy(false); }
  }

  async function requestPasswordReset() {
    if (!supabase) { setMessage({ kind: "error", text: "Password recovery requires the connected Supabase authentication service." }); return; }
    if (!email.trim()) {
      setMessage({ kind: "error", text: "Enter your email address first so we know where to send the recovery link." });
      document.getElementById("gateway-email")?.focus();
      return;
    }
    setAuthBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      setMessage({ kind: "success", text: "If an account exists for that address, a password recovery link will arrive shortly. Check your email." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not request password recovery. Please retry." });
    } finally {
      setAuthBusy(false);
    }
  }

  async function saveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage({ kind: "error", text: "Password changes require the connected Supabase authentication service." }); return; }
    if (password.length < 8) { setMessage({ kind: "error", text: "Choose a password with at least 8 characters." }); return; }
    setAuthBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryMode(false);
      setPassword("");
      setMessage({ kind: "success", text: "Your password has been updated. Your workspace is ready." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not update your password. Request a new recovery link and retry." });
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setUser(null); setActiveProject(null); setShowProjectMenu(false);
    setMessage({ kind: "info", text: "You are signed out. Local starter projects remain on this device." });
    void loadProjects(null);
  }

  async function loadConversation(project: Project, currentUser: User | null = user) {
    if (!supabase || !currentUser || project.local) {
      setConversationId(null);
      setConversationMessages([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { data: conversation, error: conversationError } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("project_id", project.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation) {
        setConversationId(null);
        setConversationMessages([]);
        return;
      }
      const { data: messages, error: messagesError } = await supabase
        .from("ai_messages")
        .select("id,role,content,created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (messagesError) throw messagesError;
      setConversationId(conversation.id);
      setConversationMessages((messages ?? []) as Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? "Could not load this project's AI conversation: " + error.message : "Could not load this project's AI conversation." });
    } finally {
      setHistoryLoading(false);
    }
  }

  async function persistConversationTurn(project: Project, userText: string, assistantText: string, summary: string) {
    if (!supabase || !user || project.local) return;
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const { data, error } = await supabase.from("ai_conversations").upsert({
        user_id: user.id,
        project_id: project.id,
        title: userText.slice(0, 180) || project.title,
        model: process.env.NEXT_PUBLIC_BLINK_MODEL || "gpt-4.1-mini",
      }, { onConflict: "user_id,project_id" }).select("id").single();
      if (error) throw new Error("Could not create AI conversation: " + error.message);
      currentConversationId = data.id;
      setConversationId(data.id);
    }
    const rows = [
      { conversation_id: currentConversationId, user_id: user.id, role: "user", content: userText.slice(0, 60000), metadata: { project_id: project.id } },
      { conversation_id: currentConversationId, user_id: user.id, role: "assistant", content: assistantText.slice(0, 60000), metadata: { summary: summary.slice(0, 1000), project_id: project.id } },
    ];
    const { data, error } = await supabase.from("ai_messages").insert(rows).select("id,role,content,created_at");
    if (error) throw new Error("The project was saved, but the AI conversation could not be saved: " + error.message);
    setConversationMessages((current) => [...current, ...(data ?? []) as Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>].slice(-100));
    const { error: updateError } = await supabase.from("ai_conversations").update({ title: userText.slice(0, 180) || project.title }).eq("id", currentConversationId).eq("user_id", user.id);
    if (updateError) console.error("BLINK conversation title update failed", updateError.message);
  }

  async function persistProject(project: Project) {
    if (supabase && user) {
      const projectId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.id) ? project.id : makeId();
      const safeHtml = enforcePreviewPolicy(project.html);
      const cloudProject: Project = { ...project, id: projectId, html: safeHtml, files: project.files.map((file) => file.path === "index.html" ? { ...file, content: safeHtml } : file), local: false };
      const { data, error } = await supabase.from("projects").upsert({
        id: cloudProject.id,
        user_id: user.id,
        title: cloudProject.title.slice(0, 120),
        prompt: cloudProject.prompt.slice(0, 8000),
        html: cloudProject.html,
        files: cloudProject.files,
      }).select("id,title,prompt,html,files,updated_at").single();
      if (error) throw new Error(error.message);
      if (project.local) {
        setProjects((current) => current.filter((item) => item.id !== project.id));
        try {
          const raw = localStorage.getItem("blink.localProjects");
          const savedLocals = raw ? JSON.parse(raw) as Project[] : [];
          if (Array.isArray(savedLocals)) localStorage.setItem("blink.localProjects", JSON.stringify(savedLocals.filter((item) => item.id !== project.id)));
        } catch { /* the cloud copy is saved even if local storage is unavailable */ }
      }
      return { ...cloudProject, ...data, files: Array.isArray(data.files) ? data.files as Project["files"] : [], local: false } as Project;
    }
    const localProject: Project = { ...project, local: true };
    saveLocalProjects([localProject, ...projects.filter((p) => p.id !== localProject.id)].slice(0, 50));
    return localProject;
  }

  async function startGeneration() {
    const trimmed = prompt.trim();
    if (trimmed.length < 12) { setMessage({ kind: "error", text: "Describe your app in at least a sentence so BLINK has enough context." }); textareaRef.current?.focus(); return; }
    if (!supabase) {
      setMessage({ kind: "error", text: "Cloud generation is not configured yet. Add the Supabase URL and public key, then configure the server AI key." });
      return;
    }
    if (!user) {
      setAuthMode("signup"); setAuthOpen(true);
      setMessage({ kind: "info", text: "Create an account or sign in before generating an app." });
      return;
    }
    if (!generationReady) { setMessage({ kind: "error", text: "AI generation is not configured yet. Set the server environment variables and apply the database migration." }); return; }
    if (activeProject && activeProject.html.length > 120000) {
      setMessage({ kind: "error", text: "This project is too large to send as edit context. Use the source editor for a focused change, or start a smaller project." });
      return;
    }
    const existingFiles = activeProject?.files.filter((file) => file.path.toLowerCase() !== "index.html") ?? [];
    const invalidContextFile = existingFiles.find((file) => !isSafeGeneratedFilePath(file.path));
    const supportingFilesBytes = existingFiles.reduce((total, file) => total + new TextEncoder().encode(file.content).byteLength, 0);
    if (invalidContextFile) {
      setMessage({ kind: "error", text: "This project contains an unsafe source-file path. Remove or rename that file before using AI editing." });
      return;
    }
    if (existingFiles.length > 29 || supportingFilesBytes > 80000) {
      setMessage({ kind: "error", text: "This project has too much supporting source to send safely as edit context. Make a focused change in the source editor or remove unused files first." });
      return;
    }
    const generationBody = JSON.stringify({
      prompt: trimmed,
      projectName: activeProject?.title,
      existingHtml: activeProject?.html,
      existingFiles,
    });
    if (new TextEncoder().encode(generationBody).byteLength > 440000) {
      setMessage({ kind: "error", text: "This project's source context is too large to send safely. Use a shorter prompt or edit the source directly." });
      return;
    }
    setGenerating(true); setMessage(null); setActiveTab("preview");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionData.session.access_token },
        body: generationBody,
      });
      const data = await response.json() as GeneratedProject & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not generate this project.");
      const generatedFiles = data.files?.length ? data.files : starterFiles(data.html);
      const generatedPaths = new Set(generatedFiles.map((file) => file.path.toLowerCase()));
      const retainedFiles = existingFiles.filter((file) => !generatedPaths.has(file.path.toLowerCase()));
      const mergedFiles = [...generatedFiles, ...retainedFiles].slice(0, 30);
      const project: Project = { id: activeProject && !activeProject.local ? activeProject.id : makeId(), title: (data.name || "Untitled project").slice(0, 120), prompt: trimmed, html: data.html, files: mergedFiles, updated_at: new Date().toISOString(), local: false };
      const saved = await persistProject(project);
      setActiveProject(saved);
      setPreviewRuntimeError(null);
      setPreviewRevision((revision) => revision + 1);
      setActiveFilePath("index.html");
      setCodeDraft(saved.files.find((file) => file.path === "index.html")?.content || saved.html);
      setProjects((current) => [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 50));
      await persistConversationTurn(saved, trimmed, data.summary || "Your application is ready. Preview it, inspect the code, or download the HTML.", data.summary || "Application generated successfully.");
      setMessage({ kind: "success", text: data.summary || "Your application is ready. Preview it, inspect the code, or download the HTML." });
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Generation failed. Please try again." }); }
    finally { setGenerating(false); }
  }

  function createStarter(template: Template) {
    const html = makeStarterHtml(template.kind);
    const project: Project = { id: makeId(), title: template.title, prompt: "Starter template: " + template.title + ". " + template.description, html, files: starterFiles(html), updated_at: new Date().toISOString(), local: true };
    const next = [project, ...projects.filter((p) => p.id !== project.id)].slice(0, 50);
    saveLocalProjects(next); setActiveProject(project); setConversationId(null); setConversationMessages([]); setActiveFilePath("index.html"); setCodeDraft(html); setPrompt(project.prompt); setActiveTab("preview"); setPreviewRuntimeError(null); setPreviewRevision((revision) => revision + 1);
    setMessage({ kind: "success", text: template.title + " is ready to explore. This starter is saved locally on this device." });
  }

  async function saveCurrentProject() {
    if (!activeProject) return;
    try {
      const saved = await persistProject({ ...activeProject, updated_at: new Date().toISOString() });
      setActiveProject(saved);
      setProjects((current) => [saved, ...current.filter((p) => p.id !== saved.id)]);
      setMessage({ kind: "success", text: saved.local ? "Saved to this device. Sign in to keep projects in your private cloud workspace." : "Project saved to your private cloud workspace." });
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not save the project." }); }
  }

  function openProject(project: Project) { setActiveProject(project); setConversationId(null); setConversationMessages([]); setActiveFilePath("index.html"); setCodeDraft(project.files.find((file) => file.path === "index.html")?.content || project.html); setPrompt(project.prompt); setActiveTab("preview"); setMessage(null); setPreviewRuntimeError(null); setPreviewRevision((revision) => revision + 1); void loadConversation(project); }

  async function deleteProject(project: Project) {
    try {
      if (supabase && user && !project.local) {
        const { error } = await supabase.from("projects").delete().eq("id", project.id);
        if (error) throw new Error(error.message);
      }
      const next = projects.filter((item) => item.id !== project.id);
      if (project.local) saveLocalProjects(next);
      else setProjects(next);
      if (activeProject?.id === project.id) { setActiveProject(null); setPrompt(""); }
      setMessage({ kind: "success", text: "Project deleted." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not delete the project." });
    }
  }

  function applyCodeChanges() {
    if (!activeProject) return;
    const targetPath = activeFilePath || "index.html";
    const exists = activeProject.files.some((file) => file.path === targetPath);
    const files = exists
      ? activeProject.files.map((file) => file.path === targetPath ? { ...file, content: codeDraft } : file)
      : [...activeProject.files, { path: targetPath, content: codeDraft }];
    const isPreviewDocument = targetPath === "index.html";
    const updated: Project = { ...activeProject, html: isPreviewDocument ? codeDraft : activeProject.html, files, updated_at: new Date().toISOString() };
    setActiveProject(updated);
    if (isPreviewDocument) { setPreviewRuntimeError(null); setPreviewRevision((revision) => revision + 1); }
    setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
    setMessage({ kind: "success", text: isPreviewDocument ? "Changes applied to the preview. Use Save to persist the updated project." : "Source file updated. The live preview uses index.html; save the project to persist all files." });
    if (isPreviewDocument) setActiveTab("preview");
  }

  function downloadProject() {
    if (!activeProject) return;
    const blob = new Blob([enforcePreviewPolicy(activeProject.html)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (activeProject.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "blink-project") + ".html";
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    setMessage({ kind: "success", text: "HTML download started." });
  }

  async function downloadSourceBundle() {
    if (!activeProject) return;
    try {
      const zip = new JSZip();
      const entries = activeProject.files.filter((file) => file.path.toLowerCase() !== "index.html");
      const reservedPaths = new Set(["index.html"]);
      for (const file of entries) {
        const pathKey = file.path.toLowerCase();
        if (!isSafeGeneratedFilePath(file.path) || reservedPaths.has(pathKey)) {
          throw new Error("The project contains an unsafe or duplicate source path.");
        }
        reservedPaths.add(pathKey);
      }
      zip.file("index.html", enforcePreviewPolicy(activeProject.html));
      for (const file of entries) zip.file(file.path, file.content);
      const safeName = activeProject.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "blink-project";
      let notesPath = reservedPaths.has("readme.md") ? "BLINK-EXPORT-NOTES.md" : "README.md";
      let notesSuffix = 2;
      while (reservedPaths.has(notesPath.toLowerCase())) {
        notesPath = "BLINK-EXPORT-NOTES-" + notesSuffix + ".md";
        notesSuffix += 1;
      }
      zip.file(notesPath, "# " + activeProject.title + "\n\nGenerated with BLINK.\n\nOpen index.html in a browser to preview the standalone application.\n\nNote: external network access is disabled in the preview for safety. Server-dependent features require your own backend integration.\n");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeName + "-source.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ kind: "success", text: "Source bundle downloaded with the HTML and generated files." });
    } catch {
      setMessage({ kind: "error", text: "Could not create the source bundle. Try downloading the standalone HTML instead." });
    }
  }

  const setupHint = !backendConfigured ? "Connect Supabase to enable secure accounts and cloud projects." : !generationReady ? "Add the AI provider key and apply the Supabase migration to enable generation." : "Your builder is ready for AI generation.";

  if (authInitializing) {
    return <main className="auth-gateway auth-gateway-loading"><div className="auth-loading-card"><span className="brand-mark"><Sparkles size={18}/></span><LoaderCircle size={19} className="spin"/><strong>Restoring your workspace</strong><span>Securing your session…</span></div></main>;
  }

  if (!user || recoveryMode) {
    return <main className="auth-gateway">
      <section className="auth-gateway-grid">
        <div className="auth-story">
          <div className="auth-topbrand">
            <button className="auth-brand" type="button" aria-label="BLINK home"><span className="brand-mark"><Sparkles size={18} strokeWidth={2.4}/></span><span>BLINK<span className="brand-period">.</span></span></button>
            <span className="auth-status-tag"><span className="auth-status-dot"/>{!supabase ? "STATIC PREVIEW" : generationReady ? "AI WORKSPACE READY" : "ACCOUNT SERVICE READY"}</span>
          </div>
          <div className="auth-story-copy">
            <div className="auth-eyebrow"><Sparkles size={13}/> FROM FIRST THOUGHT TO FIRST BUILD</div>
            <h1>Make room for<br/>what's <span>possible.</span></h1>
            <p>A calmer place to turn an idea into a real, editable web experience. Describe what you need, see it running, and keep shaping it until it feels right.</p>
            <div className="auth-proof-grid">
              <article><span>01</span><strong>Describe it</strong><small>Start with your idea, not a blank editor.</small></article>
              <article><span>02</span><strong>See it work</strong><small>Explore your result in a live, isolated preview.</small></article>
              <article><span>03</span><strong>Make it yours</strong><small>Edit code, refine with AI and export source.</small></article>
            </div>
          </div>
          <div className="auth-story-footer"><span><ShieldCheck size={14}/> Your projects stay private to your account.</span><span>BLACK / WHITE / INDIGO</span></div>
        </div>
        <div className="auth-panel-wrap">
          <section className="auth-panel" aria-labelledby="auth-title">
            <div className="auth-panel-top"><span className="auth-panel-kicker">{recoveryMode ? "ACCOUNT SECURITY" : authMode === "signup" ? "A GOOD PLACE TO BEGIN" : "GOOD TO HAVE YOU BACK"}</span><span className="auth-step">01 <span>/ 01</span></span></div>
            <h2 id="auth-title">{recoveryMode ? "Set a new password." : authMode === "signup" ? "Create your space." : "Welcome back."}</h2>
            <p className="auth-panel-description">{recoveryMode ? "Choose a new password before returning to your private workspace." : authMode === "signup" ? "One account for every idea you want to bring to life." : "Sign in to pick up where your last idea left off."}</p>
            {!recoveryMode && <div className="auth-mode-switch" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={authMode === "signup"} className={authMode === "signup" ? "selected" : ""} onClick={() => { setAuthMode("signup"); setMessage(null); }}>Create account</button>
              <button type="button" role="tab" aria-selected={authMode === "signin"} className={authMode === "signin" ? "selected" : ""} onClick={() => { setAuthMode("signin"); setMessage(null); }}>Sign in</button>
            </div>}
            <form className="auth-gateway-form" onSubmit={(event) => void (recoveryMode ? saveNewPassword(event) : handleAuth(event))}>
              {!recoveryMode && <><label htmlFor="gateway-email">Email address</label>
              <div className="auth-gateway-input"><Mail size={16}/><input id="gateway-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></>}
              <div className="auth-label-row"><label htmlFor="gateway-password">{recoveryMode ? "New password" : "Password"}</label>{(recoveryMode || authMode === "signup") && <span>8 characters or more</span>}{!recoveryMode && authMode === "signin" && <button type="button" className="auth-forgot" onClick={() => void requestPasswordReset()} disabled={authBusy}>Forgot password?</button>}</div>
              <div className="auth-gateway-input"><LockKeyhole size={16}/><input id="gateway-password" type="password" autoComplete={recoveryMode || authMode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={recoveryMode ? "Choose a new password" : "Enter your password"} /></div>
              <button className="auth-gateway-submit" type="submit" disabled={authBusy}>{authBusy ? <><LoaderCircle size={16} className="spin"/> Please wait…</> : <>{recoveryMode ? "Update password" : authMode === "signup" ? "Create my account" : "Sign in to BLINK"} <ArrowRight size={16}/></>}</button>
              {recoveryMode && <button type="button" className="auth-back-to-signin" onClick={() => { setRecoveryMode(false); setMessage(null); setAuthMode("signin"); void supabase?.auth.signOut(); }}>Back to sign in</button>}
            </form>
            {message && <div className={"auth-gateway-message auth-gateway-message-" + message.kind} role="status"><span>{message.kind === "error" ? <X size={15}/> : message.kind === "success" ? <Check size={15}/> : <CircleHelp size={15}/>}</span><p>{message.text}</p><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss notice"><X size={14}/></button></div>}
            {!supabase ? <div className="auth-setup-notice"><span className="auth-setup-icon"><LockKeyhole size={16}/></span><div><strong>Secure account service isn't connected here yet.</strong><p>This URL is the static GitHub Pages preview. It cannot submit accounts or run the server-side AI API. Deploy the full Next.js app and add the private environment settings to activate this form.</p><a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmidomochaqis-web%2FBLINK&project-name=blink-platform" target="_blank" rel="noreferrer">Set up the full BLINK app <ArrowRight size={13}/></a></div></div> : !generationReady ? <div className="auth-setup-notice"><span className="auth-setup-icon"><LockKeyhole size={16}/></span><div><strong>The AI workspace needs its final setup.</strong><p>Your account service is configured, but generation requires the server-side AI key and the BLINK database migrations. The app will report setup or provider errors rather than pretending a build succeeded.</p><a href="https://github.com/midomochaqis-web/BLINK#environment" target="_blank" rel="noreferrer">Review server configuration <ArrowRight size={13}/></a></div></div> : null}
            <div className="auth-security-note"><ShieldCheck size={15}/><span>Passwords are sent only to the configured authentication provider. BLINK never stores them in project records.</span></div>
          </section>
          <footer className="auth-panel-footer"><span>© BLINK</span><span>Build with intent. Keep the details.</span></footer>
        </div>
      </section>
    </main>;
  }

  return <main className="app-shell">
    {sidebarOpen && <aside className="sidebar">
      <button className="brand" onClick={resetWorkspace} aria-label="BLINK home"><span className="brand-mark"><Sparkles size={17} strokeWidth={2.5}/></span><span>BLINK<span className="brand-period">.</span></span></button>
      <button className="new-project-button" onClick={resetWorkspace}><Plus size={16}/> New project <span className="shortcut">⌘ K</span></button>
      <div className="sidebar-label">WORKSPACE</div>
      <button className="side-link active" onClick={resetWorkspace}><LayoutDashboard size={17}/> Overview</button>
      <button className="side-link" onClick={() => { setProjectQuery(""); setMessage({ kind: "info", text: "Your recent projects are listed below. Choose one to reopen it." }); }}><FolderKanban size={17}/> My projects <span className="count">{projects.length}</span></button>
      <div className="sidebar-section-heading"><span className="sidebar-label">RECENT PROJECTS</span><button className="icon-button subtle" aria-label="Clear project search" onClick={() => setProjectQuery("")}><Search size={14}/></button></div>
      <div className="project-search"><Search size={14}/><input value={projectQuery} onChange={(e) => setProjectQuery(e.target.value)} placeholder="Find a project" aria-label="Search projects"/></div>
      <div className="project-list">{loadingProjects ? <div className="sidebar-empty"><LoaderCircle size={15} className="spin"/> Loading projects…</div> : visibleProjects.length ? visibleProjects.map((p) => <div className="project-item" key={p.id}><button className={"project-link " + (activeProject?.id === p.id ? "selected" : "")} onClick={() => openProject(p)} title={p.title}><FileCode2 size={15}/><span>{p.title}</span><span className="project-date">{formatDate(p.updated_at)}</span></button><button className="delete-project" onClick={() => void deleteProject(p)} aria-label={"Delete " + p.title} title="Delete project"><Trash2 size={13}/></button></div>) : <div className="sidebar-empty">Your projects will appear here.</div>}</div>
      <div className="sidebar-bottom">
        <div className="usage-card"><div className="usage-icon"><Zap size={15}/></div><div><strong>Build without limits.</strong><p>Ideas in. Apps out.</p></div><ArrowRight size={15}/></div>
        <button className="side-link" onClick={() => setMessage({ kind: "info", text: setupHint })}><CircleHelp size={17}/> Help & setup</button>
        {user ? <button className="profile-row" onClick={() => setShowProjectMenu((s) => !s)}><span className="avatar">{(user.email?.[0] || "B").toUpperCase()}</span><span className="profile-text"><strong>{user.email?.split("@")[0] || "Your account"}</strong><small>{user.email}</small></span><MoreHorizontal size={17}/></button> : <button className="profile-row" onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}><span className="avatar"><LockKeyhole size={15}/></span><span className="profile-text"><strong>Your workspace</strong><small>Sign in to sync projects</small></span><ArrowRight size={16}/></button>}
        {showProjectMenu && user && <div className="account-popover"><div className="account-email">{user.email}</div><button onClick={signOut}><LogOut size={14}/> Sign out</button></div>}
      </div>
    </aside>}
    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle sidebar"><PanelLeftClose size={17}/></button><span className="crumb-slash">/</span><span className="crumb-current">{activeProject?.title || "Workspace"}</span>{activeProject?.local && <span className="local-pill">LOCAL</span>}</div><div className="topbar-actions"><div className={"status-indicator " + (generationReady ? "ready" : "")}><span/> {generationReady ? "Builder ready" : "Setup required"}</div>{user ? <button className="top-user" onClick={() => setShowProjectMenu((s) => !s)} aria-label="Account menu"><span className="avatar small">{(user.email?.[0] || "B").toUpperCase()}</span><ChevronDown size={14}/></button> : <button className="button button-secondary sign-in-top" onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}>Sign in</button>}<button className="button button-primary top-cta" onClick={() => { if (!user) { setAuthMode("signup"); setAuthOpen(true); } else { textareaRef.current?.focus(); } }}><Sparkles size={15}/> Start building</button></div></header>
      <div className="workspace-content">
        <section className={"intro-section " + (activeProject ? "intro-compact" : "")}><div className="intro-badge"><span className="sparkle-pulse"><Sparkles size={13}/></span> THE AI APP BUILDER</div><h1>{activeProject ? <>Keep shaping<br/><span className="headline-accent">{activeProject.title}</span></> : <>Your idea.<br/><span className="headline-accent">A working app.</span></>}</h1><p>{activeProject ? "Refine your brief, generate a new version, or inspect what you have built." : "Describe what you have in mind. BLINK turns your words into a real, editable web experience."}</p></section>
        <section className="composer" aria-label="Describe your application"><div className="composer-label"><span><Sparkles size={15}/> {activeProject ? "HOW SHOULD WE IMPROVE IT?" : "WHAT ARE WE BUILDING TODAY?"}</span><span className="composer-counter">{prompt.length.toLocaleString()}/8,000</span></div><textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value.slice(0, 8000))} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void startGeneration(); } }} placeholder="A customer portal for my business, with sign-in, project tracking, billing and a calm, minimalist design…" rows={4} aria-label="Describe your app" maxLength={8000}/><div className="composer-footer"><div className="composer-tools"><span className="model-pill"><span className="model-dot"/><Sparkles size={13}/> BLINK AI</span><span className="composer-divider"/><span className="composer-hint"><ShieldCheck size={13}/> Private by design</span></div><button className="button button-primary generate-button" disabled={generating} onClick={() => void startGeneration()}>{generating ? <><LoaderCircle size={16} className="spin"/> Building…</> : <><Sparkles size={15}/> {activeProject ? "Update app" : "Generate app"} <ArrowRight size={15}/></>}</button></div></section>
        <div className="prompt-shortcuts"><span>Try asking:</span>{EXAMPLE_PROMPTS.slice(0, 2).map((example) => <button key={example} onClick={() => setPrompt(example)}>{example.length > 49 ? example.slice(0, 49) + "…" : example}</button>)}</div>
        {message && <div className={"notice notice-" + message.kind} role="status"><span className="notice-icon">{message.kind === "success" ? <Check size={15}/> : message.kind === "error" ? <X size={15}/> : <CircleHelp size={15}/>}</span><span>{message.text}</span><button aria-label="Dismiss notice" onClick={() => setMessage(null)}><X size={14}/></button></div>}
        {activeProject ? <section className="builder-panel">
          <div className="preview-toolbar"><div className="preview-title"><span className="live-dot"/><strong>{activeProject.title}</strong><span className="preview-version">Latest version</span></div><div className="preview-actions"><div className="preview-tabs"><button className={activeTab === "preview" ? "selected" : ""} onClick={() => setActiveTab("preview")}><Eye size={14}/> Preview</button><button className={activeTab === "code" ? "selected" : ""} onClick={() => { const path = activeProject.files.some((file) => file.path === activeFilePath) ? activeFilePath : "index.html"; setActiveFilePath(path); setCodeDraft(activeProject.files.find((file) => file.path === path)?.content || activeProject.html); setActiveTab("code"); }}><Code2 size={14}/> Code</button></div><div className="device-toggle"><button className={!mobilePreview ? "selected" : ""} onClick={() => setMobilePreview(false)} aria-label="Desktop preview"><Monitor size={15}/></button><button className={mobilePreview ? "selected" : ""} onClick={() => setMobilePreview(true)} aria-label="Mobile preview"><Smartphone size={15}/></button></div><button className="icon-button" onClick={() => void saveCurrentProject()} title="Save project" aria-label="Save project"><Save size={15}/></button><button className="icon-button" onClick={() => void downloadSourceBundle()} title="Download complete source bundle" aria-label="Download complete source bundle"><Archive size={15}/></button><button className="icon-button" onClick={downloadProject} title="Download HTML" aria-label="Download HTML"><ArrowDownToLine size={15}/></button></div></div>
          {activeTab === "preview" ? <div className="preview-stage">{previewRuntimeError && <div className="preview-runtime-error" role="status"><CircleHelp size={14}/><span><strong>Preview runtime error</strong> {previewRuntimeError}</span><button type="button" onClick={() => setPreviewRuntimeError(null)}>Dismiss</button></div>}<div className={"browser-frame " + (mobilePreview ? "mobile-frame" : "")}><div className="browser-chrome"><div className="traffic-lights"><i/><i/><i/></div><div className="browser-url"><LockKeyhole size={10}/> blink-preview.local</div><button className="browser-reload" type="button" onClick={() => { setPreviewRuntimeError(null); setPreviewRevision((revision) => revision + 1); }} aria-label="Restart preview" title="Restart preview"><ArrowRight size={13}/></button></div><iframe ref={previewFrameRef} key={previewRevision} className="preview-iframe" title={"Preview of " + activeProject.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={createPreviewDocument(activeProject.html)}/></div></div> : <div className="code-panel"><div className="code-file"><FileCode2 size={14}/><select className="source-file-select" aria-label="Choose source file" value={activeFilePath} onChange={(event) => { const path = event.target.value; setActiveFilePath(path); setCodeDraft(activeProject.files.find((file) => file.path === path)?.content || (path === "index.html" ? activeProject.html : "")); }}><option value="index.html">index.html</option>{activeProject.files.filter((file) => file.path !== "index.html").map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select><button onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(codeDraft).then(() => setMessage({ kind: "success", text: "Source code copied." })).catch(() => setMessage({ kind: "error", text: "Clipboard access was denied." })); }}><Code2 size={13}/> Copy source</button><button className="apply-code-button" onClick={applyCodeChanges}><Check size={13}/> Apply changes</button></div><textarea className="code-editor" aria-label="Edit generated HTML" spellCheck={false} value={codeDraft} maxLength={700000} onChange={(event) => setCodeDraft(event.target.value)} /></div>}
          <div className="preview-footer"><span><ShieldCheck size={14}/> Runs in a sandboxed preview</span><span>{activeProject.files.length} file{activeProject.files.length === 1 ? "" : "s"} <span className="footer-dot">·</span> {activeProject.local ? "Saved on this device" : "Cloud project"}</span></div>
        </section> : <section className="templates-section"><div className="section-heading"><div><div className="section-eyebrow">A HEAD START</div><h2>Start with a strong foundation.</h2><p>Explore a working starter, or generate something entirely your own.</p></div><button className="text-button" onClick={() => setMessage({ kind: "info", text: setupHint })}>How it works <ArrowRight size={14}/></button></div><div className="template-grid">{TEMPLATES.map((template, index) => { const Icon = template.icon; return <button className="template-card" key={template.id} onClick={() => createStarter(template)}><div className={"template-art art-" + template.kind}><div className="art-window"><div className="art-window-top"><span/><span/><span/></div>{template.kind === "landing" ? <div className="art-landing"><i/><b/><b/><em/><span/></div> : template.kind === "dashboard" ? <div className="art-dashboard"><i/><div><b/><b/><b/></div><span/><span/><span/></div> : <div className="art-portfolio"><i/><b/><b/><span/><span/></div>}</div><span className="template-number">0{index + 1}</span><span className="template-tag">{template.tag}</span></div><div className="template-card-copy"><div className="template-icon"><Icon size={16}/></div><div className="template-copy-text"><strong>{template.title}</strong><p>{template.description}</p></div><span className="template-arrow"><ArrowRight size={16}/></span></div></button>; })}</div><div className="bottom-callout"><div className="callout-icon"><Rocket size={17}/></div><div><strong>Every great product starts somewhere.</strong><p>Use a starter as a reference—or write your own idea above to generate a custom application.</p></div><button className="button button-secondary" onClick={() => { textareaRef.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Write a prompt <ArrowRight size={14}/></button></div></section>}
        <footer className="workspace-footer"><span>BLINK<span className="brand-period">.</span> <span className="footer-muted">Build with intelligence.</span></span><span><span className="footer-muted">{setupHint}</span> <span className="footer-dot">·</span> <button onClick={() => setMessage({ kind: "info", text: "BLINK previews run in a sandbox. Keep service-role and AI keys on the server, never in client code." })}>Security</button></span></footer>
      </div>
    </section>
    {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close dialog"><X size={17}/></button><div className="modal-brand"><span className="brand-mark"><Sparkles size={17}/></span> BLINK<span className="brand-period">.</span></div><div className="auth-eyebrow">YOUR CREATIVE WORKSPACE</div><h2 id="auth-title">{authMode === "signup" ? "Make room for your ideas." : "Welcome back."}</h2><p>{authMode === "signup" ? "Create an account to generate apps and keep your projects in sync." : "Sign in to continue building where you left off."}</p><form onSubmit={(event) => void handleAuth(event)}><label htmlFor="auth-email">Email address</label><div className="auth-input"><Mail size={16}/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></div><label htmlFor="auth-password">Password</label><div className="auth-input"><LockKeyhole size={16}/><input id="auth-password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"/></div><button className="button button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? <><LoaderCircle size={15} className="spin"/> Please wait…</> : <>{authMode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={15}/></>}</button></form><div className="auth-switch">{authMode === "signup" ? "Already have an account?" : "New to BLINK?"}<button onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setMessage(null); }}>{authMode === "signup" ? "Sign in" : "Create account"}</button></div><div className="auth-security"><ShieldCheck size={14}/> Your projects are private to your account.</div></section></div>}
  </main>;
}
