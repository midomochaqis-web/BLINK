"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight, Bot, Check, ChevronDown, CircleHelp, Code2, FileCode2,
  FolderTree, LockKeyhole, Menu, Plus, Rocket, ShieldCheck, Sparkles,
  Terminal, Workflow, X, LoaderCircle
} from "lucide-react";

type Plan = {
  projectName: string;
  summary: string;
  features: string[];
  pages: string[];
  dataModels: string[];
  securityChecks: string[];
  fileTree: string[];
  recommendedStack: string[];
  agents: { name: string; task: string }[];
};

const starterPrompts = [
  { label: "E-commerce", text: "Create an e-commerce store with product listings, a shopping cart, customer accounts, secure checkout, and an admin dashboard." },
  { label: "Company dashboard", text: "Create a company operations dashboard to manage employees, assign tasks, track sales, and view weekly reports." },
  { label: "Booking platform", text: "Create a booking platform with user accounts, service listings, calendar availability, reservations, and an admin panel." },
];

const agentCards = [
  { icon: Workflow, name: "Planner", desc: "Turns your brief into a clear product specification." },
  { icon: FolderTree, name: "Architect", desc: "Defines a maintainable file and module structure." },
  { icon: ShieldCheck, name: "Security", desc: "Checks secrets, access rules, and unsafe patterns." },
  { icon: Code2, name: "Builder", desc: "Creates code in small, reviewable changes." },
  { icon: Check, name: "Verifier", desc: "Runs quality gates before changes are accepted." },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("My first project");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "security">("overview");
  const [mobileMenu, setMobileMenu] = useState(false);

  const progress = useMemo(() => plan ? 20 : 0, [plan]);

  async function createPlan() {
    if (description.trim().length < 12) {
      setError("Add a little more detail (at least 12 characters) so BLINK can prepare a useful plan.");
      return;
    }
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, projectName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the plan.");
      setPlan(data.plan as Plan);
      setActiveTab("overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><span>BLINK<span className="brand-ai"> AI</span></span><button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="workspace-switch"><div className="workspace-avatar">B</div><div className="workspace-copy"><strong>Personal workspace</strong><span>Free workspace</span></div><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active"><Code2 size={17} /> App builder <span className="nav-dot" /></button>
        <button className="nav-item" onClick={() => { setPlan(null); setDescription(""); }}><FolderTree size={17} /> Projects <span className="nav-count">1</span></button>
        <button className="nav-item" onClick={() => setActiveTab("security")}><ShieldCheck size={17} /> Security center</button>
        <div className="nav-label nav-label-spaced">BUILD</div>
        <div className="side-feature"><div className="side-feature-icon"><Bot size={17} /></div><div><strong>AI agents</strong><span>5 specialist roles</span></div><span className="live-dot" /></div>
        <div className="side-feature"><div className="side-feature-icon"><Terminal size={17} /></div><div><strong>Build pipeline</strong><span>Quality gates enabled</span></div><span className="live-dot" /></div>
        <div className="sidebar-bottom"><div className="help-row"><CircleHelp size={17} /><span>Help & documentation</span><ArrowUpRight size={14} /></div><div className="user-profile"><div className="user-avatar">M</div><div className="user-copy"><strong>My workspace</strong><span>Builder plan</span></div><Menu size={16} /></div></div>
      </aside>

      {mobileMenu && <button className="mobile-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
      <section className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>App builder</strong></div><div className="topbar-right"><span className="status-pill"><span className="live-dot" /> Systems ready</span><button className="avatar-small">M</button></div></header>

        <div className="content">
          <div className="eyebrow"><span className="eyebrow-line" /> THE STRUCTURED AI APP BUILDER</div>
          <div className="hero-row"><div><h1>Build something<br /><span>remarkable.</span></h1><p className="hero-subtitle">From a simple idea to a structured codebase — with architecture and security built in from day one.</p></div><div className="hero-orb"><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-core"><Sparkles size={28} /></div><span className="orb-tag">AI ENGINE <i /></span></div></div>

          <div className="builder-grid">
            <section className="prompt-card panel">
              <div className="card-heading"><div><span className="section-kicker">01 / YOUR IDEA</span><h2>What are we building?</h2></div><span className="step-number">01</span></div>
              <label className="field-label" htmlFor="projectName">Project name</label>
              <input id="projectName" className="text-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} maxLength={60} placeholder="e.g. Northstar Store" />
              <div className="field-label prompt-label"><label htmlFor="description">Describe your application</label><span>{description.length}/4000</span></div>
              <textarea id="description" className="prompt-input" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 4000))} placeholder="I want to build a platform that helps people..." rows={6} />
              <div className="prompt-footer"><span className="input-hint"><Sparkles size={14} /> Plain language is all you need</span><span className="secure-hint"><LockKeyhole size={13} /> Private by design</span></div>
              <div className="starter-row"><span>TRY A STARTER</span>{starterPrompts.map((starter) => <button key={starter.label} className="starter-chip" onClick={() => setDescription(starter.text)}>{starter.label}</button>)}</div>
              {error && <div className="error-banner" role="alert">{error}</div>}
              <button className="primary-button" onClick={createPlan} disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Preparing your plan...</> : <><Sparkles size={17} /> Generate project plan <ArrowUpRight size={16} /></>}</button>
              <p className="disclaimer">Planning preview only — code generation and deployment are not enabled yet.</p>
            </section>

            <section className="agents-card panel">
              <div className="card-heading"><div><span className="section-kicker">02 / THE BLINK ENGINE</span><h2>Specialist agents</h2></div><span className="agent-count">05 <span>AGENTS</span></span></div>
              <p className="muted-copy">Each role has a defined responsibility. A central orchestrator will coordinate the workflow and enforce quality gates.</p>
              <div className="agent-list">{agentCards.map((agent, i) => { const Icon = agent.icon; return <div className="agent-row" key={agent.name}><div className={`agent-icon agent-${i}`}><Icon size={17} /></div><div className="agent-info"><strong>{agent.name}</strong><span>{agent.desc}</span></div><span className="agent-state">{i === 0 && plan ? "READY" : "DEFINED"}</span></div>; })}</div>
              <div className="pipeline-box"><div className="pipeline-title"><span>PIPELINE STATUS</span><span>{plan ? "PLAN READY" : "AWAITING INPUT"}</span></div><div className="pipeline-track"><span style={{ width: `${progress}%` }} /></div><div className="pipeline-foot"><span>{plan ? "Requirements analyzed" : "No build started"}</span><span>{progress}%</span></div></div>
            </section>
          </div>

          {plan && <section className="result-panel panel">
            <div className="result-heading"><div><span className="section-kicker">03 / PROJECT BLUEPRINT</span><h2>{plan.projectName}</h2><p>{plan.summary}</p></div><span className="result-badge"><Check size={14} /> PLAN GENERATED</span></div>
            <div className="result-tabs"><button className={activeTab === "overview" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("overview")}>Overview</button><button className={activeTab === "files" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("files")}>File structure <span>{plan.fileTree.length}</span></button><button className={activeTab === "security" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("security")}>Security checks <span>{plan.securityChecks.length}</span></button></div>
            {activeTab === "overview" && <div className="result-columns"><ResultList title="Core features" items={plan.features} /><ResultList title="Pages & screens" items={plan.pages} /><ResultList title="Data models" items={plan.dataModels} /><ResultList title="Recommended stack" items={plan.recommendedStack} /></div>}
            {activeTab === "files" && <div className="file-tree">{plan.fileTree.map((file) => <div className="file-row" key={file}><FileCode2 size={15} /><code>{file}</code></div>)}</div>}
            {activeTab === "security" && <div className="security-list">{plan.securityChecks.map((item) => <div className="security-row" key={item}><ShieldCheck size={16} /><span>{item}</span><span className="check-label">PLANNED</span></div>)}</div>}
            <div className="result-footer"><span><LockKeyhole size={14} /> This is a planning blueprint, not a security certification.</span><button className="secondary-button" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(plan, null, 2)); }}>Copy blueprint <ArrowUpRight size={14} /></button></div>
          </section>}

          <section className="principles-section"><div className="principles-title"><span className="section-kicker">THE BLINK STANDARD</span><h2>Not just generated. <span>Well-engineered.</span></h2></div><div className="principles-grid"><Principle icon={FolderTree} number="01" title="Architecture first" text="Plan the structure before writing files. Keep features modular as the project evolves." /><Principle icon={ShieldCheck} number="02" title="Security by default" text="Make secrets, permissions, and dependency checks part of the build pipeline." /><Principle icon={Check} number="03" title="Verified changes" text="Use repeatable tests and reviewable diffs before accepting generated changes." /></div></section>
          <footer className="footer"><div className="footer-brand"><div className="brand-mark mini"><Sparkles size={14} /></div> BLINK AI</div><span>Build with clarity. Ship with confidence.</span><span>FOUNDATION PREVIEW · v0.2</span></footer>
        </div>
      </section>
    </main>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return <div className="result-list"><h3>{title}</h3>{items.map((item) => <div className="result-item" key={item}><span className="tiny-check"><Check size={12} /></span><span>{item}</span></div>)}</div>;
}

function Principle({ icon: Icon, number, title, text }: { icon: typeof FolderTree; number: string; title: string; text: string }) {
  return <article className="principle-card"><div className="principle-top"><div className="principle-icon"><Icon size={18} /></div><span>{number}</span></div><h3>{title}</h3><p>{text}</p></article>;
}
