// @ts-check
(function () {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");

  /** @type {{ hasToken: boolean, exports: Array<Record<string, string>>, showRating: boolean, text: Record<string, string> }} */
  let state = { hasToken: false, exports: [], showRating: false, outputRoot: "", text: {} };
  let busy = { active: false, message: "" };

  const ICONS = {
    archive:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25c0-.69.56-1.25 1.25-1.25h3.1c.4 0 .78.19 1.01.52l.6.83c.05.06.12.1.2.1h5.69c.69 0 1.25.56 1.25 1.25v7.55c0 .69-.56 1.25-1.25 1.25H2.75c-.69 0-1.25-.56-1.25-1.25zm1.25-.25a.25.25 0 0 0-.25.25v8.9c0 .14.11.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.7a.25.25 0 0 0-.25-.25H7.66c-.4 0-.78-.2-1.01-.52l-.6-.84A.25.25 0 0 0 5.85 3z"/></svg>',
    link: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.24 3.16a3.1 3.1 0 0 1 4.38 4.39l-1.6 1.6a.75.75 0 1 1-1.06-1.07l1.6-1.6a1.6 1.6 0 0 0-2.26-2.26l-1.6 1.6a.75.75 0 0 1-1.06-1.06zM6.44 7.5a.75.75 0 0 1 1.06 0 .75.75 0 0 1 0 1.06l-1.6 1.6a1.6 1.6 0 0 0 2.26 2.26l1.6-1.6a.75.75 0 1 1 1.06 1.06l-1.6 1.6a3.1 3.1 0 0 1-4.38-4.38z"/><path d="M9.72 5.22a.75.75 0 0 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06z"/></svg>',
    chat: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 2h11c.55 0 1 .45 1 1v7.5c0 .55-.45 1-1 1H7.2l-3 2.4a.5.5 0 0 1-.81-.39V11.5H2.5c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1zm0 1.25v7h1.64c.3 0 .55.25.55.55v1.4l2.2-1.76a.9.9 0 0 1 .56-.19h5.8v-7z"/></svg>',
    markdown:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12v8H2zm1.2 1.2v5.6h1.2V7.9l1.3 1.8 1.3-1.8v2.9h1.2V5.2H7l-1.3 1.9L4.4 5.2zm7.3 0v3H9.2l1.9 2.6L13 8.2h-1.3v-3z"/></svg>',
    folder:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25C1.5 2.56 2.06 2 2.75 2h3.1c.4 0 .78.19 1.01.52l.6.83c.05.06.12.1.2.1h5.69c.69 0 1.25.56 1.25 1.25v7.55c0 .69-.56 1.25-1.25 1.25H2.75c-.69 0-1.25-.56-1.25-1.25z"/></svg>',
    close:
      '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4.3 3.3 8 7l3.7-3.7.7.7L8.7 7.7l3.7 3.7-.7.7L8 8.4l-3.7 3.7-.7-.7 3.7-3.7L3.6 4z"/></svg>',
    project:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 2h4.1c.4 0 .78.19 1.01.52l.6.83c.05.06.12.1.2.1h4.59c.69 0 1.25.56 1.25 1.25v8.05c0 .69-.56 1.25-1.25 1.25H2.75c-.69 0-1.25-.56-1.25-1.25V3.25C1.5 2.56 2.06 2 2.75 2m0 1.25v9.5h10.5V4.7H8.66c-.4 0-.78-.2-1.01-.52l-.6-.84a.25.25 0 0 0-.2-.09zM4.5 6.5h7v1.2h-7zm0 2.6h7v1.2h-7z"/></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .74 4.3L8 11.4l-3.84 2 .73-4.3-3.1-3 4.3-.6z"/></svg>'
  };

  window.addEventListener("message", (event) => {
    if (!event.data) return;
    if (event.data.type === "state") {
      state = event.data.payload;
      render();
    }
    if (event.data.type === "busy") {
      busy = event.data.payload;
      render();
    }
  });

  function post(type, id) {
    vscode.postMessage(id === undefined ? { type } : { type, id });
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );
  }

  function card(options) {
    const badge = options.badge
      ? `<span class="badge">${escapeHtml(options.badge)}</span>`
      : "";
    return `<button class="card" data-action="${options.action}">
      <span class="icon">${options.icon}</span>
      <span class="card-text">
        <span class="card-title">${escapeHtml(options.title)}</span>
        <span class="card-note">${escapeHtml(options.note)}</span>
        ${badge}
      </span>
    </button>`;
  }

  function exportRow(entry) {
    const t = state.text;
    return `<div class="row" data-action="open" data-id="${escapeHtml(entry.id)}" tabindex="0">
      <span class="icon">${ICONS.chat}</span>
      <span class="row-text">
        <span class="row-title">${escapeHtml(entry.title)}</span>
        <span class="row-note">${escapeHtml(entry.subtitle)}</span>
      </span>
      <span class="row-actions">
        <button class="icon-btn" data-action="markdown" data-id="${escapeHtml(entry.id)}" title="${escapeHtml(t.openMarkdown)}">${ICONS.markdown}</button>
        <button class="icon-btn" data-action="folder" data-id="${escapeHtml(entry.id)}" title="${escapeHtml(t.revealFolder)}">${ICONS.folder}</button>
        <button class="icon-btn" data-action="forget" data-id="${escapeHtml(entry.id)}" title="${escapeHtml(t.forget)}">${ICONS.close}</button>
      </span>
    </div>`;
  }

  function recentSection() {
    const t = state.text;
    const body = state.exports.length
      ? state.exports.map(exportRow).join("")
      : `<p class="empty">${escapeHtml(t.noExports)}</p>`;
    const where = state.outputRoot
      ? `<p class="hint" title="${escapeHtml(state.outputRoot)}">${escapeHtml(
          (t.savedIn || "{0}").replace("{0}", state.outputRoot)
        )}</p>`
      : "";
    return `<section>
      <h2 class="section-title">${escapeHtml(t.recent)}</h2>
      ${where}
      ${body}
    </section>`;
  }

  function tokenSection() {
    const t = state.text;
    const label = state.tokenLabel || (state.hasToken ? t.tokenSet : t.tokenMissing);
    const primary = state.hasToken
      ? `<button class="btn secondary" data-action="clearToken">${escapeHtml(t.removeToken)}</button>`
      : `<button class="btn" data-action="setToken">${escapeHtml(t.addToken)}</button>`;
    return `<section>
      <h2 class="section-title">${escapeHtml(t.account)}</h2>
      <div class="token ${state.tokenState === "valid" ? "is-set" : ""} ${state.tokenState === "expired" ? "is-stale" : ""}">
        <span class="dot"></span>
        <span class="token-label">${escapeHtml(label)}</span>
      </div>
      <div class="actions">
        ${primary}
        <button class="btn secondary" data-action="tokenHelp">${escapeHtml(t.getToken)}</button>
      </div>
    </section>`;
  }

  function ratingSection() {
    if (!state.showRating) return "";
    const t = state.text;
    return `<section class="rating">
      <span class="icon">${ICONS.star}</span>
      <div class="rating-text">
        <span class="card-title">${escapeHtml(t.rateTitle)}</span>
        <span class="card-note">${escapeHtml(t.rateNote)}</span>
        <div class="actions">
          <button class="btn" data-action="review">${escapeHtml(t.rateAction)}</button>
          <button class="btn secondary" data-action="dismissRating">${escapeHtml(t.rateDismiss)}</button>
        </div>
      </div>
    </section>`;
  }

  function busyStrip() {
    if (!busy.active) return "";
    const label = busy.message || state.text.working || "";
    return `<div class="busy" role="status" aria-live="polite">
      <span class="spinner"></span>
      <span class="busy-label">${escapeHtml(label)}</span>
    </div>`;
  }

  function render() {
    const t = state.text;
    root.classList.toggle("is-busy", Boolean(busy.active));
    root.innerHTML = `<div class="stack">
      ${busyStrip()}
      <div class="intro"><p>${escapeHtml(t.intro)}</p></div>
      <section>
        <h2 class="section-title">${escapeHtml(t.newExport)}</h2>
        ${card({
          action: "exportArchive",
          icon: ICONS.archive,
          title: t.archiveTitle,
          note: t.archiveNote,
          badge: t.recommended
        })}
        ${card({
          action: "exportProject",
          icon: ICONS.project,
          title: t.projectTitle,
          note: t.projectNote
        })}
        ${card({
          action: "exportUrl",
          icon: ICONS.link,
          title: t.urlTitle,
          note: t.urlNote
        })}
      </section>
      ${recentSection()}
      ${tokenSection()}
      ${ratingSection()}
      <p class="footer">
        <a href="#" data-action="review">${escapeHtml(t.reviewLink)}</a>
        <span class="footer-sep">\u00b7</span>
        ${escapeHtml(t.footer)}
      </p>
      <p class="credit">${escapeHtml(t.builtBy)} <a href="${escapeHtml(t.builderUrl)}">${escapeHtml(t.builderName)}</a></p>
    </div>`;
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    if (busy.active && target.dataset.action !== "review") {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    post(target.dataset.action, target.dataset.id);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest(".row[data-action]");
    if (!target) return;
    event.preventDefault();
    post("open", target.dataset.id);
  });

  post("ready");
})();
