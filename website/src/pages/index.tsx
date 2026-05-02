import React, { useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import '@site/src/css/landing.css';

type TerminalLine = {
  type: 'prompt' | 'input' | 'tool' | 'output' | 'agent' | 'stream';
  text: string;
};

const heroLines: TerminalLine[] = [
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'install skill from https://example.com/daily-digest.md' },
  { type: 'tool', text: '  [Using: install_skill]' },
  { type: 'output', text: '  Skill "daily-digest" installed successfully.' },
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'schedule daily-digest every day at 9am' },
  { type: 'tool', text: '  [Using: schedule_task]' },
  { type: 'output', text: '  Task scheduled: daily-digest (cron: 0 9 * * *)' },
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'fetch latest repos of hotheadhacker' },
  { type: 'tool', text: '  [Using: fetch_url]' },
  { type: 'agent', text: 'Mercury: ' },
  { type: 'stream', text: 'Here are the latest repositories by hotheadhacker: **sekond-brain** (updated today), **no-as-a-service** (7.1k stars)...' },
];

const demoLines: TerminalLine[] = [
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'read the package.json and tell me the deps' },
  { type: 'tool', text: '  [Using: read_file]' },
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'edit the version to 0.2.0' },
  { type: 'tool', text: '  [Using: edit_file]' },
  { type: 'output', text: '  Successfully replaced "0.1.0" with "0.2.0" in package.json' },
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'commit that change' },
  { type: 'tool', text: '  [Using: git_add, git_commit]' },
  { type: 'output', text: '  [git add package.json] [git commit -m "bump version to 0.2.0"]' },
  { type: 'prompt', text: 'You: ' },
  { type: 'input', text: 'send me the package.json file' },
  { type: 'tool', text: '  [Using: send_file]' },
  { type: 'output', text: '  File sent: package.json (1.2KB)' },
  { type: 'agent', text: 'Mercury: ' },
  { type: 'stream', text: "Done! I've read the package.json, updated the version, committed the change, and sent you the file. Anything else?" },
];

function typeTerminal(container: HTMLDivElement, lines: TerminalLine[], speed: number) {
  let idx = 0;
  let charIdx = 0;
  let currentSpan: HTMLSpanElement | null = null;

  function nextLine() {
    if (idx >= lines.length) return;
    const line = lines[idx];

    if (line.type === 'prompt') {
      const span = document.createElement('span');
      span.className = 'lp-prompt';
      span.textContent = line.text;
      container.appendChild(span);
      idx++;
      nextLine();
      return;
    }

    if (line.type === 'input') {
      currentSpan = document.createElement('span');
      currentSpan.style.color = '#f0f0f0';
      container.appendChild(currentSpan);
      charIdx = 0;
      typeChars(line.text, () => {
        container.appendChild(document.createElement('br'));
        idx++;
        nextLine();
      });
      return;
    }

    if (line.type === 'tool') {
      const span = document.createElement('span');
      span.className = 'lp-tool';
      span.textContent = line.text;
      container.appendChild(span);
      container.appendChild(document.createElement('br'));
      idx++;
      setTimeout(nextLine, speed * 2);
      return;
    }

    if (line.type === 'output') {
      const span = document.createElement('span');
      span.className = 'lp-output';
      span.textContent = line.text;
      container.appendChild(span);
      container.appendChild(document.createElement('br'));
      idx++;
      setTimeout(nextLine, speed);
      return;
    }

    if (line.type === 'agent') {
      const span = document.createElement('span');
      span.className = 'lp-agent';
      span.textContent = line.text;
      container.appendChild(span);
      idx++;
      nextLine();
      return;
    }

    if (line.type === 'stream') {
      currentSpan = document.createElement('span');
      currentSpan.style.color = '#f0f0f0';
      container.appendChild(currentSpan);
      charIdx = 0;
      typeChars(line.text, () => {
        container.appendChild(document.createElement('br'));
        idx++;
        const cursor = document.createElement('span');
        cursor.className = 'lp-cursor';
        container.appendChild(cursor);
      }, speed * 1.5);
      return;
    }

    idx++;
    nextLine();
  }

  function typeChars(text: string, done: () => void, customSpeed?: number) {
    const s = customSpeed || speed;
    if (charIdx >= text.length) {
      done();
      return;
    }
    if (currentSpan) currentSpan.textContent += text[charIdx];
    charIdx++;
    container.scrollTop = container.scrollHeight;
    setTimeout(() => typeChars(text, done, customSpeed), s);
  }

  nextLine();
}

export default function LandingPage(): React.ReactElement {
  const heroTermRef = useRef<HTMLDivElement>(null);
  const demoTermRef = useRef<HTMLDivElement>(null);
  const [ghStars, setGhStars] = React.useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    fetch('https://api.github.com/repos/cosmicstack-labs/mercury-agent')
      .then(r => r.json())
      .then(data => {
        if (data.stargazers_count != null) {
          const n = data.stargazers_count;
          setGhStars(n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const heroEl = heroTermRef.current;
    const demoEl = demoTermRef.current;

    const heroObs = heroEl
      ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              heroObs.unobserve(entry.target);
              typeTerminal(heroEl, heroLines, 25);
            }
          });
        },
        { threshold: 0.3 }
      )
      : null;

    const demoObs = demoEl
      ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              demoObs.unobserve(entry.target);
              typeTerminal(demoEl, demoLines, 18);
            }
          });
        },
        { threshold: 0.3 }
      )
      : null;

    if (heroEl && heroObs) heroObs.observe(heroEl);
    if (demoEl && demoObs) demoObs.observe(demoEl);

    return () => {
      if (heroObs) heroObs.disconnect();
      if (demoObs) demoObs.disconnect();
    };
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll('.lp-reveal');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Head>
        <title>Mercury — Soul-Driven AI Agent with Permission Guardrails | Cosmic Stack</title>
        <meta name="description" content="The AI agent that asks before it acts. Permission guardrails, token efficiency, sub-agent orchestration, Spotify integration, and full control. Runs 24/7 from CLI or Telegram with multi-provider onboarding, skills, and scheduling." />
        <meta property="og:title" content="Mercury — Soul-Driven AI Agent with Permission Guardrails" />
        <meta property="og:description" content="The AI agent that asks before it acts. Permission guardrails, token efficiency, and full control. Runs 24/7 from CLI or Telegram." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mercury.cosmicstack.org" />
        <meta property="og:image" content="https://mercury.cosmicstack.org/img/card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mercury — Soul-Driven AI Agent with Permission Guardrails" />
        <meta name="twitter:image" content="https://mercury.cosmicstack.org/img/card.png" />
      </Head>

      <div className="lp-page">
        <nav className="lp-nav">
          <div className="lp-nav-inner">
            <Link to="/" className="lp-nav-logo">☿ Mercury</Link>
            <div className={`lp-nav-links ${mobileMenuOpen ? 'lp-nav-links-open' : ''}`}>
              <Link to="/#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link to="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>Install</Link>
              <Link to="/#demo" onClick={() => setMobileMenuOpen(false)}>Demo</Link>
              <Link to="/#capabilities" onClick={() => setMobileMenuOpen(false)}>Capabilities</Link>
              <Link to="/#github" onClick={() => setMobileMenuOpen(false)}>GitHub</Link>
              <Link to="/#compare" onClick={() => setMobileMenuOpen(false)}>Compare</Link>
              <Link to="/docs" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
            </div>
            <div className="lp-nav-right">
              <a href="https://github.com/cosmicstack-labs/mercury-agent" className="lp-github-btn" target="_blank" rel="noopener">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style={{ verticalAlign: '-2px' }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                <span className="lp-github-btn-count">{ghStars} ⭐</span>
              </a>
              <button className="lp-nav-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">☰</button>
            </div>
          </div>
        </nav>

        <section className="lp-hero">
          <div className="lp-hero-bg" />
          <div className="lp-container lp-hero-content">
            <pre className="lp-hero-ascii" aria-hidden="true">{`    __  _____________  ________  ________  __
   /  |/  / ____/ __ \\/ ____/ / / / __ \\ \\/ /
  / /|_/ / __/ / /_/ / /   / / / / /_/ /\\  /
 / /  / / /___/ _, _/ /___/ /_/ / _, _/ / /
/_/  /_/_____/_/ |_|\\____/\\____/_/ |_| /_/`}</pre>
            <p className="lp-hero-tagline">Soul-driven. Token-efficient. Always on.</p>
            <p className="lp-hero-sub">
              Your personal AI agent with 31 built-in tools, skill system, multi-agent orchestration, Spotify integration, GitHub companion, and
              hardened permissions. Runs 24/7 from your terminal or Telegram.
            </p>
            <div className="lp-hero-actions">
              <Link href="#how-it-works" className="lp-btn lp-btn-primary">Get Started</Link>
              <Link href="#demo" className="lp-btn lp-btn-secondary">See it in action</Link>
            </div>
            <div className="lp-hero-install">
              <code>npm i -g @cosmicstack/mercury-agent && mercury</code>
            </div>
            <div className="lp-terminal-window lp-hero-terminal">
              <div className="lp-terminal-bar">
                <span className="lp-terminal-dot lp-dot-red" />
                <span className="lp-terminal-dot lp-dot-yellow" />
                <span className="lp-terminal-dot lp-dot-green" />
                <span className="lp-terminal-title">terminal</span>
              </div>
              <div className="lp-terminal-body" ref={heroTermRef} />
            </div>
          </div>
        </section>

        <section id="features" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-section-title">Built Different</h2>
            <p className="lp-section-sub">Not another chatbot. An orchestrator that works for you.</p>
            <div className="lp-features-grid">
              {[
                { icon: '☿', title: 'Soul-Driven Identity', desc: "Mercury isn't a blank slate. Its personality is defined by markdown soul files — soul.md, persona.md, taste.md, heartbeat.md — that you control." },
                { icon: '⚡', title: 'Token-Efficient', desc: 'Daily token budgets with enforcement. Only soul + persona injected per request (~400 tokens). Progressive skill loading. Auto-concise when budget exceeds 70%.' },
                { icon: '♾', title: 'Always On', desc: 'Background daemon by default. Cron scheduling, delayed tasks, and a heartbeat system. Auto-starts on boot, auto-restarts on crash.' },
                { icon: '📡', title: 'Multi-Channel', desc: 'CLI with readline and arrow-key menus. Telegram with typing indicators, HTML formatting, file uploads, and private 1:1 access.' },
                { icon: '🤖', title: 'Sub-Agents', desc: 'Spawn parallel AI agents for concurrent tasks. Mercury orchestrates — research, code, and review run simultaneously. Non-blocking: keep chatting while agents work.' },
                { icon: '🎵', title: 'Spotify Integration', desc: 'Native Spotify control through conversation. Play music, manage playlists, DJ on your devices. Search, like, queue — all through natural language.' },
                { icon: '🧩', title: 'Skill System', desc: 'Install community skills with a single command. Skills auto-load into context, get elevated permissions, and can be scheduled as recurring tasks.' },
                { icon: '🛡', title: 'Permission Hardened', desc: 'Folder-level read/write scoping. Command blocklist. Pending approval flow. Ask Me or Allow All mode per session.' },
              ].map((f, i) => (
                <div key={i} className="lp-feature-card lp-reveal">
                  <div className="lp-feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="second-brain" className="lp-section lp-section-alt">
          <div className="lp-container">
            <h2 className="lp-section-title">🧠 Second Brain</h2>
            <p className="lp-section-sub">Most AI agents forget everything when you close the chat. Mercury <em>remembers</em> — automatically, privately, and with surgical precision.</p>
            <div className="lp-brain-grid">
              {[
                { title: 'Learns Automatically', desc: 'After each conversation, Mercury extracts facts about you — your preferences, goals, projects, habits, relationships, and decisions.' },
                { title: 'Recalls What Matters', desc: 'Only memories relevant to the current conversation are injected — up to 5 facts within a 900-character budget.' },
                { title: 'Resolves Conflicts', desc: 'When Mercury detects a contradiction, the higher-confidence memory wins. No stale data.' },
                { title: '10 Memory Types', desc: 'Identity, preference, goal, project, habit, decision, constraint, relationship, episode, and reflection — each scored by confidence, importance, and durability.' },
                { title: 'Auto-Consolidation', desc: 'Every hour Mercury synthesizes a profile summary and generates reflections from patterns it detects.' },
                { title: 'You Stay in Control', desc: '/memory gives you overview, search, pause, and clear. All data stays on your machine in SQLite — nothing leaves.' },
              ].map((c, i) => (
                <div key={i} className="lp-brain-card lp-reveal">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="lp-section lp-section-dark">
          <div className="lp-container">
            <h2 className="lp-section-title">Up and Running in 60 Seconds</h2>
            <div className="lp-steps">
              {[
                { num: 1, title: 'Install', cmd: 'npm i -g @cosmicstack/mercury-agent', desc: 'Or use npx @cosmicstack/mercury-agent — no install needed.' },
                { num: 2, title: 'Setup', cmd: 'mercury', desc: 'First run triggers the onboarding wizard. Choose providers, validate keys, pick your default model, optionally pair Telegram.' },
                { num: 3, title: 'Run', cmd: 'mercury start', desc: 'Mercury wakes up, loads your soul files, restores scheduled tasks, and runs as a background daemon.' },
              ].map((s, i) => (
                <div key={i} className="lp-step lp-reveal">
                  <div className="lp-step-number">{s.num}</div>
                  <h3>{s.title}</h3>
                  <div className="lp-terminal-inline"><code>{s.cmd}</code></div>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-section-title">See It Work</h2>
            <p className="lp-section-sub">A real Mercury session — tool calls, streaming, files, and scheduling.</p>
            <div className="lp-terminal-window" style={{ maxWidth: 760, margin: '0 auto' }}>
              <div className="lp-terminal-bar">
                <span className="lp-terminal-dot lp-dot-red" />
                <span className="lp-terminal-dot lp-dot-yellow" />
                <span className="lp-terminal-dot lp-dot-green" />
                <span className="lp-terminal-title">mercury</span>
              </div>
              <div className="lp-terminal-body" ref={demoTermRef} />
            </div>
          </div>
        </section>

        <section id="capabilities" className="lp-section lp-section-dark">
          <div className="lp-container">
            <h2 className="lp-section-title">31 Built-In Tools</h2>
            <p className="lp-section-sub">Plus extensible skills, scheduling, and memory.</p>
            <div className="lp-caps-grid">
              {[
                { title: '📂 Filesystem', items: ['read_file — Read file contents', 'write_file — Write to existing file', 'create_file — Create new files (+ dirs)', 'edit_file — Search & replace text', 'list_dir — List directory contents', 'delete_file — Delete a file', 'send_file — Send file to user', 'approve_scope — Request directory access'] },
                { title: '💬 Messaging', items: ['send_message — Send a message to approved Telegram recipients'] },
                { title: '🐚 Shell', items: ['run_command — Execute shell commands', 'cd — Change working directory', 'approve_command — Permanently approve a command'] },
                { title: '📦 Git', items: ['git_status — Working tree status', 'git_diff — Show file changes', 'git_log — Commit history', 'git_add — Stage files', 'git_commit — Create commits', 'git_push — Push to remote'] },
                { title: '🐙 GitHub', items: ['create_pr — Create pull requests', 'review_pr — Review PRs + post comments', 'list_issues — List & filter issues', 'create_issue — Create new issues', 'github_api — Raw API access', 'Co-authored-by on every commit'] },
                { title: '🎵 Spotify', items: ['spotify_search — Search tracks, artists, albums, playlists', 'spotify_play — Play on your devices', 'spotify_pause/next/previous — Playback controls', 'spotify_now_playing — What\'s playing + progress bar', 'spotify_devices — List & select devices', 'spotify_like/top_tracks/playlists — Library access', 'spotify_volume/shuffle/repeat/queue — Full player control'] },
                { title: '🤖 Sub-Agents', items: ['delegate_task — Spawn parallel AI agents', 'list_agents — Monitor running agents', 'stop_agent — Halt a specific agent', '/agents — See all agents + status', '/halt — Emergency stop all agents', 'File locks for concurrent safety', 'Auto-concurrency from CPU/RAM'] },
                { title: '🧩 Skills', items: ['install_skill — Install from URL or content', 'list_skills — Show installed skills', 'use_skill — Invoke a skill'] },
                { title: '⏰ Scheduler', items: ['schedule_task — Cron or one-shot tasks', 'list_scheduled_tasks — View all tasks', 'cancel_scheduled_task — Cancel a task'] },
                { title: '📊 System', items: ['budget_status — Check token budget'] },
                { title: '🧠 Memory', items: ['Short-term — Recent conversation per channel', 'Long-term — Auto-extracted facts with dedup', 'Episodic — Timestamped interaction log'] },
              ].map((g, i) => (
                <div key={i} className="lp-cap-group lp-reveal">
                  <h3>{g.title}</h3>
                  <ul>{g.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="compare" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-section-title">Honest Comparison</h2>
            <p className="lp-section-sub">We built Mercury because nothing else did all of this.</p>
            <div className="lp-compare-table lp-reveal">
              <table>
                <thead>
                  <tr><th>Feature</th><th className="lp-highlight">Mercury</th><th>Open Interpreter</th><th>Claude Code</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Soul / Persona System', '4 markdown files', 'Custom instructions', 'CLAUDE.md'],
                    ['Token Budget', 'Daily budget + override', '—', '—'],
                    ['Multi-Channel', 'CLI + Telegram + more', 'All', 'All'],
                    ['Sub-Agents', 'Parallel AI workers, non-blocking', '—', '—'],
                    ['Spotify Integration', 'Native playback + DJ mode', '—', '—'],
                    ['Skill System', 'Install, invoke, schedule', '—', '—'],
                    ['Cron + Delayed Scheduling', 'Persisted, auto-restore', '—', '—'],
                    ['Permission Hardening', 'Blocklist + scope + approval', 'Confirmation prompts', 'Permission prompts'],
                    ['GitHub Companion', 'PRs, issues, co-authored commits', '—', '—'],
                    ['Proactive Notifications', 'Heartbeat + task alerts', '—', '—'],
                    ['Auto Fact Extraction', 'With dedup', '—', '—'],
                    ['Provider Fallback', 'Auto with last-successful', 'Manual config', 'Anthropic only'],
                    ['File Upload (Telegram)', 'Auto type detection', '—', '—'],
                    ['Streaming Output', 'Real-time text stream', 'Real-time text stream', 'Real-time text stream'],
                    ['Headless / 24-7', 'Built-in', '—', '—'],
                    ['Language', 'TypeScript / Node.js', 'Python', 'TypeScript / Node.js'],
                    ['Open Source', 'MIT', 'LGPL-2.1', 'Source-available'],
                  ].map((row, i) => (
                    <tr key={i}>
                      <td>{row[0]}</td>
                      <td className="lp-highlight">{row[1]}</td>
                      <td className={row[2] === '—' ? 'lp-no' : 'lp-partial'}>{row[2]}</td>
                      <td className={row[3] === '—' ? 'lp-no' : 'lp-partial'}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="architecture" className="lp-section lp-section-dark">
          <div className="lp-container">
            <h2 className="lp-section-title">Under the Hood</h2>
            <p className="lp-section-sub">Minimal runtime, maximum capability.</p>
            <div className="lp-arch-grid">
              {[
                { label: 'Core', value: 'TypeScript + Node.js 18+', desc: 'ESM, tsup build, SQLite-backed second brain' },
                { label: 'AI SDK', value: 'Vercel AI SDK v4', desc: 'streamText + generateText, 10-step agentic loop' },
                { label: 'Sub-Agents', value: 'Same-process async coroutines', desc: 'Parallel task delegation, file locks, resource-aware concurrency' },
                { label: 'Spotify', value: 'Native Web API integration', desc: 'OAuth2 auth, 14 tools, DJ mode skill, Premium + free support' },
                { label: 'Providers', value: 'DeepSeek · OpenAI · Anthropic · Grok · Ollama Cloud · Ollama Local', desc: 'Validated onboarding, model discovery, and fallback with last-successful tracking' },
                { label: 'Memory', value: 'JSONL + SQLite', desc: 'Short-term, long-term, episodic + second brain' },
                { label: 'Telegram', value: 'grammY', desc: 'Long polling, pairing codes, CLI-managed access requests, broadcasts, file uploads' },
                { label: 'Runtime Data', value: '~/.mercury/', desc: 'Config, soul, memory, permissions, skills, schedules — all in your home dir' },
              ].map((a, i) => (
                <div key={i} className="lp-arch-card lp-reveal">
                  <div className="lp-arch-label">{a.label}</div>
                  <div className="lp-arch-value">{a.value}</div>
                  <div className="lp-arch-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="providers" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-section-title">Supported Providers</h2>
            <p className="lp-section-sub">Pick one or stack them all. Mercury falls back automatically.</p>
            <div className="lp-provider-grid lp-reveal">
              {[
                { name: 'DeepSeek', desc: 'Default provider. Cost-effective with strong reasoning.' },
                { name: 'OpenAI', desc: 'GPT-4o-mini, GPT-4o, o3. Industry standard.' },
                { name: 'Anthropic', desc: 'Claude Sonnet, Haiku, Opus. Nuanced reasoning.' },
                { name: 'Grok (xAI)', desc: "xAI's models. OpenAI-compatible endpoint." },
                { name: 'Ollama Cloud', desc: 'Remote Ollama models via API. No local setup.' },
                { name: 'Ollama Local', desc: 'On your machine. Zero API cost, fully private.' },
              ].map((p, i) => (
                <div key={i} className="lp-provider-card">
                  <div className="lp-provider-logo">⚡</div>
                  <div className="lp-provider-info">
                    <h3>{p.name}</h3>
                    <p>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-provider-note">
              <p>More providers on the way — Google Gemini, Mistral, and others. Mercury's OpenAI-compatible architecture also supports custom endpoints.</p>
            </div>
          </div>
        </section>

        <section id="cta" className="lp-section lp-cta-section">
          <div className="lp-container">
            <h2 className="lp-section-title">Ready to Deploy Your Agent?</h2>
            <div className="lp-cta-terminal">
              <code>npm i -g @cosmicstack/mercury-agent && mercury</code>
            </div>
            <p className="lp-cta-sub">That's it. 60 seconds to your own AI agent with GitHub companion.</p>
            <div className="lp-cta-links">
              <a href="https://github.com/cosmicstack-labs/mercury-agent" target="_blank" rel="noopener">GitHub →</a>
              <a href="https://github.com/cosmicstack-labs/mercury-agent/issues" target="_blank" rel="noopener">Report an Issue →</a>
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-container lp-footer-inner">
            <div>
              <span className="lp-footer-logo">☿ Mercury</span>
              <span className="lp-footer-tagline">by Cosmic Stack</span>
            </div>
            <div className="lp-footer-links">
              <Link to="/docs">Docs</Link>
              <a href="https://mercury.cosmicstack.org">mercury.cosmicstack.org</a>
              <a href="https://github.com/cosmicstack-labs/mercury-agent">GitHub</a>
              <a href="https://github.com/cosmicstack-labs/mercury-agent/issues">Issues</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}