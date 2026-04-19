const DEFAULT_TIMEOUT_MS = 7000;

function toPositiveInt(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getApiBase(options = {}) {
  const apiBase = options.apiBase ?? import.meta.env.VITE_USER_API_BASE_URL ?? "";
  return String(apiBase ?? "").trim().replace(/\/$/, "");
}

function requireApiBase(options = {}) {
  return getApiBase(options);
}

function buildApiUrl(base, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
}

function createTimeoutSignal(parentSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeoutId)
  };
}

async function parseApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    const message =
      payload?.error?.message ??
      payload?.error ??
      payload?.message ??
      fallbackMessage;
    return new Error(String(message));
  } catch {
    return new Error(fallbackMessage);
  }
}

function estimateSizeLabel(workspace) {
  const skillMarkdown = String(workspace?.skillMarkdown ?? "");
  const skillfoMarkdown = String(workspace?.skillfoMarkdown ?? "");
  const title = String(workspace?.title ?? "");
  const raw = `${skillMarkdown}\n${skillfoMarkdown}\n${title}`;
  const bytes = new TextEncoder().encode(raw).length;
  const kiloBytes = Math.max(0.1, bytes / 1024);
  return `${kiloBytes.toFixed(1)}K`;
}

function normalizeWorkspaceFile(workspace = {}, owner = "user") {
  const id = String(workspace.id ?? "");
  const visibility = String(workspace.visibility ?? "private");
  const role = String(workspace.memberRole ?? "member");
  const title = String(workspace.title ?? "Untitled Workspace");

  return {
    id,
    mode: "-rw-r--r--",
    owner,
    group: "skillfo",
    size: estimateSizeLabel(workspace),
    updatedAt: workspace.updatedAt
      ? new Date(workspace.updatedAt).toISOString()
      : new Date().toISOString(),
    path: `workspaces/${id || "unknown"}/SKILLFO.md`,
    type: "workspace",
    tags: [visibility, role],
    description: title
  };
}

export async function fetchWorkspaceInspectorFiles(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  const base = requireApiBase(options);
  const page = toPositiveInt(options.page, 1);
  const pageSize = toPositiveInt(options.pageSize, 20);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const url = `${buildApiUrl(base, "/api/workspaces")}?${query.toString()}`;
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`
      }
    });

    if (!response.ok) {
      throw await parseApiError(response, `Workspace API ${response.status}`);
    }

    const payload = await response.json();
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const owner = String(options.owner ?? "user");

    return {
      items: rawItems.map((item) => normalizeWorkspaceFile(item, owner)),
      pagination: payload.pagination ?? null,
      backend: "remote"
    };
  } finally {
    dispose();
  }
}
