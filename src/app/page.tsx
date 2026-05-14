import Link from 'next/link';

const stats = [
  { value: '50+', label: 'channels, apps, and private tools ready to connect' },
  { value: '24/7', label: 'agent availability for ops, inboxes, and follow-up' },
  { value: 'Local', label: 'control plane designed for self-hosted workflows' },
];

const activities = [
  { title: 'Inbox triaged', detail: 'Tagged three hot leads and drafted replies in Slack.' },
  { title: 'Calendar protected', detail: 'Moved a low-priority meeting and sent a summary.' },
  { title: 'CRM updated', detail: 'Logged call notes, next step, and confidence score.' },
];

const tools = ['WhatsApp', 'Telegram', 'Slack', 'Gmail', 'Calendar', 'CRM'];

const features = [
  {
    icon: '🧠',
    title: 'Agent brain for real work',
    detail: 'Give your assistant durable memory, goals, tool permissions, and reusable playbooks instead of one-off prompts.',
  },
  {
    icon: '🔌',
    title: 'Any-channel command layer',
    detail: 'Route messages from chat apps, email, voice notes, and webhooks into one live mission console.',
  },
  {
    icon: '🛡️',
    title: 'Human-grade controls',
    detail: 'Require approvals for sensitive actions, inspect every run, and keep credentials scoped to each workflow.',
  },
];

const workflowSteps = [
  { step: 'Listen', detail: 'Capture requests from channels, forms, calls, and system events.' },
  { step: 'Plan', detail: 'Break work into tool calls, approvals, checkpoints, and fallback paths.' },
  { step: 'Act', detail: 'Execute tasks across apps while streaming progress to the operator.' },
  { step: 'Learn', detail: 'Save outcomes, preferences, reusable SOPs, and next-best automations.' },
];

const integrations = [
  'Browser control',
  'Twilio voice + SMS',
  'OpenAI models',
  'Supabase memory',
  'Google Workspace',
  'Slack operations',
  'Calendly booking',
  'Webhook actions',
  'Private knowledge base',
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <nav className="nav" aria-label="Main navigation">
          <Link href="/" className="brand" aria-label="ClawOps home">
            <span className="brand-mark">⌁</span>
            <span>ClawOps</span>
          </Link>
          <div className="nav-links">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#workflow">Workflow</a>
            <Link className="nav-link" href="/bellpro">BellPro</Link>
            <Link className="button button-primary" href="/signup">Launch agent</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <span className="eyebrow"><span className="pulse" /> OpenClaw-style automation hub</span>
            <h1>
              Your private AI agent that <span className="gradient-text">actually does things.</span>
            </h1>
            <p className="hero-copy">
              ClawOps turns your existing chat apps, calendars, inboxes, databases, and lead workflows into one
              supervised agent workspace with local-first control and visible execution.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/signup">Build my command center →</Link>
              <a className="button button-secondary" href="#workflow">See the agent loop</a>
            </div>
            <div className="stat-row" aria-label="Platform highlights">
              {stats.map((stat) => (
                <div className="stat-card" key={stat.value}>
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="command-center" aria-label="Agent command center preview">
            <div className="panel">
              <div className="panel-header">
                <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
                <span className="status-pill">Live run</span>
              </div>
              <div className="agent-card">
                <div className="agent-title">
                  <div className="avatar">🦾</div>
                  <div>
                    <h2>OpsClaw</h2>
                    <p>Autonomous assistant with approval guardrails</p>
                  </div>
                </div>
                <div className="message-stack">
                  <div className="message user">Summarize missed calls, book serious buyers, and alert me before noon.</div>
                  <div className="message agent">I found 8 missed calls, qualified 3 urgent leads, drafted replies, and queued two bookings for approval.</div>
                </div>
                <div className="tool-grid">
                  {tools.map((tool) => (
                    <span className="tool-chip" key={tool}>↳ {tool}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel activity-feed">
              {activities.map((activity) => (
                <div className="activity-item" key={activity.title}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="section" id="features">
          <div className="section-heading">
            <h2>Built like an agent cockpit, not another chatbot.</h2>
            <p>
              OpenClaw-inspired experiences shine when they connect conversation to action. This app gives operators
              the panels, approvals, context, and channel routing needed to trust automation.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="workflow">
          <div className="workflow-grid">
            <article className="workflow-card">
              <span className="eyebrow">Agent loop</span>
              <h3>From message to mission accomplished.</h3>
              <p>
                Each run moves through a transparent loop so a person can observe, approve, pause, or improve the
                agent before it touches critical systems.
              </p>
              <div className="workflow-list">
                {workflowSteps.map((item, index) => (
                  <div className="workflow-step" key={item.step}>
                    <strong>{String(index + 1).padStart(2, '0')} / {item.step}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="workflow-card">
              <span className="eyebrow">Connected workbench</span>
              <h3>Bring the agent to the apps your team already uses.</h3>
              <p>
                Start with a concierge setup, then expand into custom tools, voice agents, business automations,
                research tasks, and revenue recovery workflows.
              </p>
              <div className="integration-cloud">
                {integrations.map((integration) => (
                  <span key={integration}>{integration}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="pricing-card">
            <div>
              <span className="eyebrow">Starter launch</span>
              <h3>Deploy your first agent workspace this week.</h3>
              <p>
                Includes command-center design, workflow mapping, channel routing, approval gates, and a launch plan
                for your first production automation.
              </p>
            </div>
            <div>
              <span className="price">$0</span>
              <Link className="button button-primary" href="/signup">Request setup</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
