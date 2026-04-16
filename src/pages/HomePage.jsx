import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useUser } from "../user/UserContext";

function formatFileTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--- -- --:--";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(",", "");
}

function HomePage() {
  const { t } = useI18n();
  const { user, isAuthenticated } = useUser();
  const quickLines = t("home.quickLines");
  const statusFeed = t("home.statusFeed");
  const heroTitle = t("home.title");

  const workspaceFiles = useMemo(() => {
    const owner = isAuthenticated ? user?.username || "user" : "guest";

    return [
      {
        id: "workspace",
        mode: "-rw-r--r--",
        owner,
        group: "skillfo",
        size: "53.0K",
        updatedAt: "2026-04-16T08:21:00Z",
        path: "src/pages/WorkspacePage.jsx",
        type: t("home.inspector.fileTypes.reactPage"),
        tags: ["core", "ui", "flow"],
        description: t("home.inspector.descriptions.workspace")
      },
      {
        id: "home",
        mode: "-rw-r--r--",
        owner,
        group: "skillfo",
        size: "6.2K",
        updatedAt: "2026-04-16T09:02:00Z",
        path: "src/pages/HomePage.jsx",
        type: t("home.inspector.fileTypes.reactPage"),
        tags: ["entry", "layout"],
        description: t("home.inspector.descriptions.home")
      },
      {
        id: "docs",
        mode: "-rw-r--r--",
        owner,
        group: "skillfo",
        size: "1.1K",
        updatedAt: "2026-04-15T14:35:00Z",
        path: "src/pages/DocsPage.jsx",
        type: t("home.inspector.fileTypes.reactPage"),
        tags: ["docs", "reference"],
        description: t("home.inspector.descriptions.docs")
      },
      {
        id: "styles",
        mode: "-rw-r--r--",
        owner,
        group: "skillfo",
        size: "82.4K",
        updatedAt: "2026-04-16T09:11:00Z",
        path: "src/styles.css",
        type: t("home.inspector.fileTypes.stylesheet"),
        tags: ["theme", "global"],
        description: t("home.inspector.descriptions.styles")
      },
      {
        id: "i18n",
        mode: "-rw-r--r--",
        owner,
        group: "skillfo",
        size: "12.7K",
        updatedAt: "2026-04-15T10:20:00Z",
        path: "src/i18n/translations.js",
        type: t("home.inspector.fileTypes.localization"),
        tags: ["i18n", "copy"],
        description: t("home.inspector.descriptions.i18n")
      }
    ];
  }, [isAuthenticated, t, user?.username]);

  const [activeFileId, setActiveFileId] = useState(() => workspaceFiles[0]?.id ?? "");
  const activeFile = workspaceFiles.find((item) => item.id === activeFileId) ?? workspaceFiles[0];

  return (
    <article className="page page-home">
      <section className="hero-zone">
        <p className="section-tag">{t("home.sectionTag")}</p>
        <h2 className="hero-title chroma-text" data-text={heroTitle}>
          {heroTitle}
        </h2>
        <p className="hero-copy">{t("home.copy")}</p>
        <div className="hero-actions">
          <Link className="action-btn primary" to="/workspace">
            {t("home.actionWorkspace")}
          </Link>
          <Link className="action-btn" to="/forge">
            {t("home.actionForge")}
          </Link>
        </div>
      </section>

      <section className="terminal-surface workspace-inspector">
        <header className="workspace-inspector-head">
          <div>
            <h3>{t("home.inspector.command")}</h3>
            <p className="workspace-inspector-meta">{t("home.inspector.meta")}</p>
          </div>
          <Link className="action-btn small-btn" to="/docs#command-main">
            {t("home.inspector.jumpDocs")}
          </Link>
        </header>

        <div className="workspace-inspector-layout">
          <div className="workspace-file-table">
            <div className="workspace-file-head">
              <span>{t("home.inspector.columns.mode")}</span>
              <span>{t("home.inspector.columns.owner")}</span>
              <span>{t("home.inspector.columns.group")}</span>
              <span>{t("home.inspector.columns.size")}</span>
              <span>{t("home.inspector.columns.time")}</span>
              <span>{t("home.inspector.columns.path")}</span>
            </div>
            <ul className="workspace-file-list">
              {workspaceFiles.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    className={`workspace-file-row${activeFile?.id === file.id ? " is-active" : ""}`}
                    onClick={() => setActiveFileId(file.id)}
                  >
                    <span className="ls-mode">{file.mode}</span>
                    <span className="ls-owner">{file.owner}</span>
                    <span className="ls-owner">{file.group}</span>
                    <span className="ls-size">{file.size}</span>
                    <span className="ls-time">{formatFileTime(file.updatedAt)}</span>
                    <span className="ls-path">{file.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="workspace-detail-panel">
            <section className="workspace-prop-bar">
              <h4>{t("home.inspector.propertiesTitle")}</h4>
              <div className="workspace-prop-grid">
                <span>{t("home.inspector.labels.file")}</span>
                <span>{activeFile?.path}</span>
                <span>{t("home.inspector.labels.type")}</span>
                <span>{activeFile?.type}</span>
                <span>{t("home.inspector.labels.mode")}</span>
                <span>{activeFile?.mode}</span>
                <span>{t("home.inspector.labels.description")}</span>
                <span>{activeFile?.description}</span>
              </div>
              <p className="workspace-tag-line">{activeFile?.tags?.join(" · ")}</p>
            </section>

            <section className="workspace-action-bar">
              <h4>{t("home.inspector.actionsTitle")}</h4>
              <div className="workspace-action-grid">
                <button type="button" className="node-tool-btn accent">
                  {t("home.inspector.actions.open")}
                </button>
                <button type="button" className="node-tool-btn">
                  {t("home.inspector.actions.preview")}
                </button>
                <button type="button" className="node-tool-btn">
                  {t("home.inspector.actions.copyPath")}
                </button>
                <Link className="node-tool-btn action-link-btn" to="/workspace">
                  {t("home.inspector.actions.goWorkspace")}
                </Link>
                <Link className="node-tool-btn action-link-btn" to="/docs#command-main">
                  {t("home.inspector.actions.openDocsMain")}
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="split-zone">
        <div className="terminal-surface">
          <h3>{t("home.quickTitle")}</h3>
          <ul className="mono-list">
            {quickLines.map((line) => (
              <li key={line}>
                <span className="list-prefix">&gt;</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="terminal-surface">
          <h3>{t("home.systemTitle")}</h3>
          <ul className="mono-list">
            {statusFeed.map((line) => (
              <li key={line}>
                <span className="list-prefix">*</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}

export default HomePage;
