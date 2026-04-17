import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchForgeMarketplace } from "../services/forgeMarketplaceApi";
import { useI18n } from "../i18n/I18nContext";
import { useUser } from "../user/UserContext";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import UserLoginModal from "./UserLoginModal";

const NAV_ITEMS = [
  { to: "/", key: "home", idx: "01", fallback: { zh: "首页", en: "Home" } },
  { to: "/workspace", key: "workspace", idx: "02", fallback: { zh: "工作区", en: "Workspace" } },
  { to: "/forge", key: "forge", idx: "03", fallback: { zh: "工坊", en: "Forge" } },
  { to: "/docs", key: "docs", idx: "04", fallback: { zh: "文档", en: "Docs" } }
];

const ROUTE_COMMANDS = {
  "/": { key: "app.commands.home", fallback: "boot --page home --profile focus" },
  "/workspace": { key: "app.commands.workspace", fallback: "workspace open --mode deep-work" },
  "/forge": { key: "app.commands.forge", fallback: "forge run --prototype rapid" },
  "/profile": { key: "app.commands.profile", fallback: "profile open --user current" },
  "/docs": { key: "app.commands.docs", fallback: "docs index --scope all" }
};

const ROUTE_FILE_MAP = {
  "/": { path: "src/pages/HomePage.jsx", size: "3.8K" },
  "/workspace": { path: "src/pages/WorkspacePage.jsx", size: "53.0K" },
  "/forge": { path: "src/pages/ForgePage.jsx", size: "18.6K" },
  "/docs": { path: "src/pages/DocsPage.jsx", size: "1.1K" },
  "/profile": { path: "src/pages/ProfilePage.jsx", size: "13.9K" }
};

const RECENT_FILES_KEY = "skillfo-recent-open-files-v1";
const SIDEBAR_COLLAPSE_KEY = "skillfo-left-sidebar-collapsed-v1";
const MAX_RECENT_FILES = 9;

function readRecentFiles() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        route: String(item.route ?? ""),
        path: String(item.path ?? ""),
        size: String(item.size ?? "1.0K"),
        mode: String(item.mode ?? "-rw-r--r--"),
        owner: String(item.owner ?? "user"),
        group: String(item.group ?? "skillfo"),
        openedAt: String(item.openedAt ?? new Date().toISOString())
      }))
      .filter((item) => item.path)
      .slice(0, MAX_RECENT_FILES);
  } catch {
    return [];
  }
}

function saveRecentFiles(files) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
  } catch {
    // noop
  }
}

function buildRecentFile(pathname) {
  const mapped = ROUTE_FILE_MAP[pathname] ?? {
    path: `src/routes${pathname || "/index"}.jsx`,
    size: "1.0K"
  };

  return {
    route: pathname,
    path: mapped.path,
    size: mapped.size,
    mode: "-rw-r--r--",
    owner: "user",
    group: "skillfo",
    openedAt: new Date().toISOString()
  };
}

function formatLsTime(iso) {
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

function getBaseName(path) {
  if (!path) return "";
  const normalized = String(path).replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || normalized;
}

function TerminalLayout({ theme, onThemeChange, locale, onLocaleChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, formatDateTime, locale: i18nLocale } = useI18n();
  const { isAuthenticated, user, isBusy } = useUser();

  const [loginOpen, setLoginOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState(() => readRecentFiles());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  });
  const [hotTemplates, setHotTemplates] = useState([]);
  const [hotTemplatesLoading, setHotTemplatesLoading] = useState(true);
  const [hotTemplatesError, setHotTemplatesError] = useState("");
  const [hotBackend, setHotBackend] = useState("remote");

  const isWorkspaceRoute = location.pathname === "/workspace";
  const isHomeRoute = location.pathname === "/";
  const isZh = i18nLocale.startsWith("zh");
  const text = (zh, en) => (isZh ? zh : en);

  const commandConfig = ROUTE_COMMANDS[location.pathname] ?? {
    key: "app.commands.fallback",
    fallback: "help --all"
  };
  const command = t(commandConfig.key, commandConfig.fallback);
  const now = formatDateTime(new Date());

  const navLabel = (item) =>
    t(`nav.${item.key}`, isZh ? item.fallback.zh : item.fallback.en);

  const userChipText = isAuthenticated
    ? `@${user?.username || "user"}`
    : isZh
      ? "登录"
      : "Sign In";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    const nextFile = buildRecentFile(location.pathname);

    setRecentFiles((previous) => {
      const deduped = previous.filter((item) => item.path !== nextFile.path);
      const merged = [nextFile, ...deduped].slice(0, MAX_RECENT_FILES);
      saveRecentFiles(merged);
      return merged;
    });
  }, [location.pathname]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setHotTemplatesLoading(true);
      setHotTemplatesError("");

      try {
        const result = await fetchForgeMarketplace(
          {
            source: "user",
            type: "template",
            sortBy: "popular",
            page: 1,
            pageSize: 6
          },
          { signal: controller.signal }
        );

        setHotTemplates(result.items ?? []);
        setHotBackend(result.backend ?? "remote");
      } catch (error) {
        if (error.name === "AbortError") return;
        setHotTemplates([]);
        setHotBackend("unavailable");
        setHotTemplatesError(error.message || "Failed to load templates.");
      } finally {
        setHotTemplatesLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, []);

  const onUserChipClick = () => {
    if (isAuthenticated) {
      navigate("/profile");
      return;
    }
    setLoginOpen(true);
  };

  const topRows = useMemo(() => {
    return hotTemplates.map((item, index) => {
      const pseudoPid = 2000 + index + 1;
      const userName = String(item.author ?? "user")
        .toLowerCase()
        .replace(/\s+/g, "")
        .slice(0, 10);

      return {
        id: item.id,
        pid: pseudoPid,
        user: userName || "user",
        likes: Number(item.likes ?? 0),
        downloads: Number(item.downloads ?? 0),
        nodes: Number(item.nodeCount ?? 0),
        title: String(item.title ?? "Untitled")
      };
    });
  }, [hotTemplates]);

  const tmuxBar = (
    <div className={`tmux-statusbar${isWorkspaceRoute ? " tmux-statusbar-bottom" : ""}`}>
      <div className="tmux-left-cluster">
        <div className="tmux-left">
          <span className="tmux-chip">{t("app.tmux.session")}</span>
          <span className="tmux-chip">{t("app.tmux.host")}</span>
        </div>

        <nav className="tmux-tabs" aria-label={t("app.navAria")}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `tmux-tab${isActive ? " is-active" : ""}`}
            >
              {() => (
                <>
                  <span className="tab-mark" aria-hidden="true">
                    *
                  </span>
                  <span className="nav-index">{item.idx}</span>
                  <span>{navLabel(item)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="tmux-right">
        <button
          type="button"
          className={`tmux-chip tmux-user-chip${isAuthenticated ? " is-auth" : " is-guest"}`}
          onClick={onUserChipClick}
          disabled={isBusy}
          title={
            isAuthenticated
              ? isZh
                ? "进入用户主页"
                : "Open profile"
              : isZh
                ? "点击登录"
                : "Click to sign in"
          }
        >
          <span className="tmux-user-dot" aria-hidden="true" />
          <span>{userChipText}</span> 
        </button>
        <span className="tmux-chip">{now}</span>
      </div>
    </div>
  );

  return (
    <div className="app-frame">
      <div className={`display-shell${isWorkspaceRoute ? " workspace-mode" : ""}`}>
        {!isWorkspaceRoute && tmuxBar}

        {!isWorkspaceRoute ? (
          <>
            {isHomeRoute && (
              <div className="command-row home-subbar">
                <div className="home-subbar-left">
                  <span className="command-prompt">{t("app.prompt")}</span>
                  <span className="command-text">{command}</span>
                  <span className="cursor-block" aria-hidden="true" />
                </div>
                <div className="home-subbar-right">
                  <ThemeSwitcher value={theme} onChange={onThemeChange} />
                  <LanguageSwitcher value={locale ?? i18nLocale} onChange={onLocaleChange} />
                </div>
              </div>
            )}

            <div
              className={`display-content with-terminal-sidebar${
                sidebarCollapsed ? " is-sidebar-collapsed" : ""
              }`}
            >
              <aside
                className={`terminal-sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}
                aria-label={text("终端侧栏", "Terminal Sidebar")}
              >
                <div className="terminal-sidebar-rail">
                  <button
                    type="button"
                    className="terminal-sidebar-toggle"
                    onClick={() => setSidebarCollapsed((previous) => !previous)}
                    title={
                      sidebarCollapsed
                        ? text("展开侧栏", "Expand sidebar")
                        : text("折叠侧栏", "Collapse sidebar")
                    }
                  >
                    {sidebarCollapsed ? "›" : "‹"}
                  </button>
                  {!sidebarCollapsed && (
                    <span className="terminal-sidebar-caption">{text("终端面板", "TERMINAL")}</span>
                  )}
                </div>

                {!sidebarCollapsed && (
                  <div className="terminal-sidebar-split">
                    <section className="terminal-pane">
                      <header className="terminal-pane-head">
                        <span>$ man skillfo-recent(5)</span>
                      </header>
                      <div className="terminal-pane-body ls-pane">
                        <p className="terminal-pane-meta">
                          SKILLFO-RECENT(5) · total {recentFiles.length}
                        </p>
                        <div className="man-list">
                          {recentFiles.map((file, index) => (
                            <article key={file.path} className="man-entry">
                              <p className="man-entry-title">
                                {index + 1}. {getBaseName(file.path)}
                              </p>
                              <p className="man-entry-line">
                                <span className="man-key">NAME</span>
                                <span className="man-value">{file.path}</span>
                              </p>
                              <p className="man-entry-line">
                                <span className="man-key">SYNOPSIS</span>
                                <span className="man-value">
                                  open {file.path} --mode {file.mode}
                                </span>
                              </p>
                              <p className="man-entry-line">
                                <span className="man-key">OWNER</span>
                                <span className="man-value">
                                  {file.owner}:{file.group} · {file.size}
                                </span>
                              </p>
                              <p className="man-entry-line">
                                <span className="man-key">UPDATED</span>
                                <span className="man-value">{formatLsTime(file.openedAt)}</span>
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="terminal-pane">
                      <header className="terminal-pane-head">
                        <span>$ top -o likes -n 6</span>
                        <span className="terminal-pane-head-meta">
                          {hotBackend === "remote"
                            ? text("backend: remote", "backend: remote")
                            : text("backend: unavailable", "backend: unavailable")}
                        </span>
                      </header>
                      <div className="terminal-pane-body top-pane">
                        <div className="top-head-row">
                          <span>PID</span>
                          <span>USER</span>
                          <span>LIKES</span>
                          <span>DL</span>
                          <span>NOD</span>
                          <span>COMMAND</span>
                        </div>

                        {hotTemplatesLoading && (
                          <p className="terminal-pane-meta">{text("加载热门模板中...", "Loading hot templates...")}</p>
                        )}

                        {!hotTemplatesLoading && hotTemplatesError && (
                          <p className="terminal-pane-meta is-error">{hotTemplatesError}</p>
                        )}

                        {!hotTemplatesLoading && !hotTemplatesError && (
                          <ul className="top-list">
                            {topRows.map((row) => (
                              <li className="top-row" key={row.id}>
                                <span>{row.pid}</span>
                                <span>{row.user}</span>
                                <span>{row.likes}</span>
                                <span>{row.downloads}</span>
                                <span>{row.nodes}</span>
                                <span title={row.title}>{row.title}</span>
                              </li>
                            ))}
                            {topRows.length === 0 && (
                              <li className="top-row top-row-empty">
                                <span>--</span>
                                <span>--</span>
                                <span>--</span>
                                <span>--</span>
                                <span>--</span>
                                <span>{text("暂无热门模板", "No hot templates")}</span>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </aside>

              <section className="page-panel">
                <Outlet />
              </section>
            </div>
          </>
        ) : (
          <section className="workspace-route-body">
            <Outlet />
          </section>
        )}

        {isWorkspaceRoute && tmuxBar}
      </div>

      <UserLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => navigate("/profile")}
      />
    </div>
  );
}

export default TerminalLayout;
