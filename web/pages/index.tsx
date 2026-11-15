import { Form, useForm } from "@void/react";
import type { Props } from "./index.server";
import "./style.css";

export default function HomePage({ messages }: Props) {
  const form = useForm("/", { text: "" });

  return (
    <main className="starter">
      <section id="center" aria-labelledby="welcome-title">
        <div className="hero">
          <img className="base" src="/stack.svg" width="170" height="179" alt="" />
          <img className="framework" src="/react.svg" alt="React logo" />
          <img className="void" src="/void.svg" alt="Void logo" />
        </div>
        <div className="starter-intro">
          <h1 id="welcome-title">Welcome to Void</h1>
          <div className="starter-description">
            <p>
              This starter is running in Pages mode. The list below is loaded from your database in <code>pages/index.server.ts</code>.
            </p>
            <p>API example: <a href="/api/hello">/api/hello</a></p>
          </div>
        </div>
      </section>
      <div className="ticks" aria-hidden="true"></div>
      <section className="starter-demo" aria-labelledby="messages-title">
        <div className="demo-content">
          <h2 id="messages-title">Messages</h2>
          {messages.length === 0 ? (
            <p className="empty-state">
              No messages yet. Run <code>void db seed</code> to load the sample row from <code>db/seed.ts</code>.
            </p>
          ) : (
            <ul className="messages">
              {messages.map((message) => (
                <li key={message.id}>
                  <strong>{message.text}</strong>
                  <small>{String(message.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
          <Form form={form} className="message-form">
            <label htmlFor="message-text">Message</label>
            <div className="message-fields">
              <input id="message-text" name="text" value={form.data.text} onChange={(event) => form.setData("text", event.target.value)} required maxLength={1000} />
              <button type="submit" disabled={form.pending}>Add message</button>
            </div>
          </Form>
        </div>
      </section>
      <div className="ticks" aria-hidden="true"></div>
      <section id="next-steps" aria-label="Resources">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://void.cloud/guide/quickstart" target="_blank" rel="noreferrer">
                Quickstart
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank" rel="noreferrer">
                <img className="button-icon" src="/react.svg" alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Void community</p>
          <ul>
            <li>
              <a href="https://github.com/voidzero-dev/void" target="_blank" rel="noreferrer">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://discord.gg/cC6TEVFKSx" target="_blank" rel="noreferrer">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/deploytovoid" target="_blank" rel="noreferrer">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/voidzero.dev" target="_blank" rel="noreferrer">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>
      <div className="ticks" aria-hidden="true"></div>
      <div id="spacer" aria-hidden="true"></div>
    </main>
  );
}
