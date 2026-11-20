/** Stylesheet inlined into the exported standalone HTML chat view. */
export const CHAT_STYLES = `
:root {
  --ink: #14212b;
  --muted: #5b6b78;
  --line: #c9d5df;
  --paper: #f7fafc;
  --author-bg: #dfeaf7;
  --author-ink: #1e3a5f;
  --assistant-bg: #ffffff;
  --assistant-ink: #0f3d38;
  --tool-bg: #f3efe6;
  --tool-ink: #6b5420;
  --accent: #0f766e;
  --shadow: 0 10px 30px rgba(20, 33, 43, 0.08);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font: 16px/1.55 "Source Sans 3", sans-serif;
  background: #d9e3ea;
}
.atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(900px 480px at 12% -10%, rgba(15, 118, 110, 0.18), transparent 60%),
    radial-gradient(700px 420px at 100% 0%, rgba(30, 58, 95, 0.16), transparent 55%),
    linear-gradient(180deg, #e7eef3 0%, #d5e0e8 100%);
  z-index: 0;
}
.page {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4.5rem;
}
.header {
  margin-bottom: 1.5rem;
  padding: 1.4rem 1.5rem 1.2rem;
  border: 1px solid rgba(201, 213, 223, 0.9);
  border-radius: 1.25rem;
  background: rgba(247, 250, 252, 0.88);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
}
.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
}
.header h1 {
  margin: 0 0 0.9rem;
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.15rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.meta {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
}
.meta li {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.6rem;
  font-size: 0.92rem;
  color: var(--ink);
  word-break: break-word;
}
.meta li span {
  color: var(--muted);
  font-weight: 600;
}
.meta a { color: #1d4f91; text-decoration: none; }
.meta a:hover { text-decoration: underline; }
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.1rem;
  padding-top: 0.95rem;
  border-top: 1px solid var(--line);
}
.count {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.toolbar-actions { display: flex; gap: 0.5rem; }
.toolbar button {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 0.88rem;
  transition: background 0.15s ease, transform 0.15s ease;
}
.toolbar button:hover {
  background: #eef5f8;
  transform: translateY(-1px);
}
.thread {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.message { display: flex; width: 100%; }
.message.role-author { justify-content: flex-end; }
.message.role-assistant,
.message.role-tool,
.message.role-other { justify-content: flex-start; }
.bubble {
  width: min(100%, 680px);
  border-radius: 1.1rem;
  border: 1px solid transparent;
  padding: 0.85rem 1rem 0.75rem;
  box-shadow: var(--shadow);
}
.role-author .bubble {
  background: var(--author-bg);
  border-color: #c5d6ea;
  border-bottom-right-radius: 0.35rem;
}
.role-assistant .bubble {
  background: var(--assistant-bg);
  border-color: #d5e1e8;
  border-bottom-left-radius: 0.35rem;
}
.role-tool .bubble,
.role-other .bubble {
  background: var(--tool-bg);
  border-color: #e2d7bf;
  width: min(100%, 640px);
}
.role-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}
.role {
  font-family: Fraunces, Georgia, serif;
  font-weight: 700;
  font-size: 1.02rem;
}
.role-author .role { color: var(--author-ink); }
.role-assistant .role { color: var(--assistant-ink); }
.role-tool .role,
.role-other .role { color: var(--tool-ink); }
.index {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  opacity: 0.8;
}
.message-body > summary {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  cursor: pointer;
  list-style: none;
  user-select: none;
  padding: 0.35rem 0.15rem;
  border-radius: 0.55rem;
}
.message-body > summary::-webkit-details-marker { display: none; }
.message-body > summary:hover { background: rgba(20, 33, 43, 0.04); }
.chevron {
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.45rem;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(-45deg);
  transition: transform 0.18s ease;
  flex: 0 0 auto;
}
.message-body[open] > summary .chevron { transform: rotate(45deg); }
.preview {
  flex: 1;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.4;
}
.toggle-hint {
  flex: 0 0 auto;
  margin-top: 0.1rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}
.message-body[open] > summary .toggle-hint { content: "hide"; }
.message-body[open] > summary .toggle-hint::after { }
.message-body[open] > summary .toggle-hint { visibility: hidden; position: relative; }
.message-body[open] > summary .toggle-hint::before {
  visibility: visible;
  content: "hide";
  position: absolute;
  right: 0;
}
.content {
  margin-top: 0.55rem;
  padding: 0.85rem 0.15rem 0.25rem;
  border-top: 1px solid rgba(201, 213, 223, 0.85);
  animation: rise 0.18s ease;
}
@keyframes rise {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.98rem;
}
.asset { margin: 0.65rem 0 0; }
.asset img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.7rem;
  border: 1px solid var(--line);
}
.file-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border-radius: 0.55rem;
  background: #eef5f8;
  color: #1d4f91;
  text-decoration: none;
  font-weight: 600;
}
.file-link:hover { text-decoration: underline; }
.missing {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-style: italic;
  font-size: 0.92rem;
}
.export-credit {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(201, 213, 223, 0.9);
  text-align: center;
}
.export-credit p {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  letter-spacing: 0.02em;
}
@media (max-width: 640px) {
  .page { padding: 1.25rem 0.85rem 3rem; }
  .header { padding: 1.1rem; border-radius: 1rem; }
  .meta li { grid-template-columns: 1fr; gap: 0.1rem; }
  .bubble { width: 100%; }
}
`.trim();
