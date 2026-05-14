import Link from 'next/link';

const agentTypes = [
  'Revenue recovery agent',
  'Executive operations agent',
  'Research and browser agent',
  'Customer support agent',
  'Custom private agent',
];

export default function SignupPage() {
  return (
    <main className="page-shell signup-page">
      <section className="form-card">
        <Link href="/" className="brand" aria-label="Back to ClawOps home">
          <span className="brand-mark">⌁</span>
          <span>ClawOps</span>
        </Link>
        <div style={{ marginTop: 30 }}>
          <span className="eyebrow"><span className="pulse" /> Agent launch request</span>
          <h1>Tell us what your OpenClaw-style assistant should run.</h1>
          <p>
            Share the channels, tools, and first mission you want automated. This static prototype is ready to connect
            to your CRM, Twilio, Supabase, OpenAI, or internal workflow APIs next.
          </p>
        </div>

        <form className="form-grid">
          <label>
            Workspace name
            <input placeholder="Acme Ops Command" name="workspace" />
          </label>
          <label>
            Primary agent mission
            <select name="agentType" defaultValue="Revenue recovery agent">
              {agentTypes.map((agentType) => (
                <option key={agentType}>{agentType}</option>
              ))}
            </select>
          </label>
          <label>
            Channels to connect
            <input placeholder="WhatsApp, Slack, Gmail, Twilio SMS..." name="channels" />
          </label>
          <label>
            Tools and systems
            <input placeholder="Calendar, CRM, browser, Supabase, Notion..." name="tools" />
          </label>
          <label>
            First workflow
            <textarea placeholder="Example: watch missed calls, qualify leads, draft SMS replies, and request approval before booking." name="workflow" />
          </label>
          <div className="form-actions">
            <button className="button button-primary" type="submit">Queue launch plan</button>
            <Link className="button button-secondary" href="/">Back to overview</Link>
          </div>
        </form>
        <p className="form-note">
          Prototype note: form submission is intentionally client-side only. Hook this page to an API route or Supabase
          table when you are ready to store launch requests.
        </p>
      </section>
    </main>
  );
}
