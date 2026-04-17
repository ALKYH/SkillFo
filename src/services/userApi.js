const DEFAULT_TIMEOUT_MS = 7000;
const SESSION_STORAGE_KEY = "skillfo-user-session-v1";

function toIso(value, fallback = new Date().toISOString()) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function normalizeUser(raw = {}) {
  return {
    id: String(raw.id ?? ""),
    username: String(raw.username ?? "guest"),
    displayName: String(raw.displayName ?? raw.username ?? "Guest"),
    email: String(raw.email ?? ""),
    role: String(raw.role ?? "user"),
    bio: String(raw.bio ?? ""),
    location: String(raw.location ?? ""),
    website: String(raw.website ?? ""),
    company: String(raw.company ?? ""),
    joinedAt: toIso(raw.joinedAt),
    lastLoginAt: toIso(raw.lastLoginAt)
  };
}

function normalizeSession(raw = {}) {
  const token = raw.accessToken ?? raw.token ?? "";
  return {
    accessToken: String(token || ""),
    refreshToken: raw.refreshToken ? String(raw.refreshToken) : "",
    expiresAt: raw.expiresAt ? toIso(raw.expiresAt) : null
  };
}

function normalizePreferences(raw = {}) {
  return {
    defaultVisibility: raw.defaultVisibility === "private" ? "private" : "public",
    notifyByEmail: Boolean(raw.notifyByEmail),
    language: String(raw.language ?? "zh-CN"),
    defaultSort: String(raw.defaultSort ?? "latest")
  };
}

function normalizeTemplate(raw = {}) {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled"),
    visibility: raw.visibility === "private" ? "private" : "public",
    likes: Number(raw.likes ?? 0),
    downloads: Number(raw.downloads ?? 0),
    updatedAt: toIso(raw.updatedAt)
  };
}

function normalizeActivity(raw = {}) {
  return {
    id: String(raw.id ?? ""),
    type: String(raw.type ?? "event"),
    title: String(raw.title ?? ""),
    timestamp: toIso(raw.timestamp)
  };
}

function normalizeDashboard(raw = {}) {
  const stats = raw.stats ?? {};
  return {
    stats: {
      templates: Number(stats.templates ?? 0),
      packs: Number(stats.packs ?? 0),
      likes: Number(stats.likes ?? 0),
      downloads: Number(stats.downloads ?? 0),
      followers: Number(stats.followers ?? 0),
      following: Number(stats.following ?? 0)
    },
    activity: Array.isArray(raw.activity) ? raw.activity.map(normalizeActivity) : [],
    templates: Array.isArray(raw.templates) ? raw.templates.map(normalizeTemplate) : [],
    preferences: normalizePreferences(raw.preferences)
  };
}

function getApiBase(options = {}) {
  const apiBase = options.apiBase ?? import.meta.env.VITE_USER_API_BASE_URL;
  return String(apiBase ?? "").trim().replace(/\/$/, "");
}

function requireApiBase(options = {}) {
  const base = getApiBase(options);
  if (!base) {
    throw new Error("User API base URL is not configured.");
  }
  return base;
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

function readJsonStorage(key) {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getStoredSession() {
  const stored = readJsonStorage(SESSION_STORAGE_KEY);
  if (!stored) return null;
  const normalized = normalizeSession(stored);
  return normalized.accessToken ? normalized : null;
}

export function persistSession(session) {
  const normalized = normalizeSession(session ?? {});
  if (!normalized.accessToken) {
    writeJsonStorage(SESSION_STORAGE_KEY, null);
    return null;
  }
  writeJsonStorage(SESSION_STORAGE_KEY, normalized);
  return normalized;
}

export function clearStoredSession() {
  writeJsonStorage(SESSION_STORAGE_KEY, null);
}

function buildAuthHeaders(session, extra = {}) {
  const headers = {
    Accept: "application/json",
    ...extra
  };

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return headers;
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

async function loginRemote(credentials, options = {}) {
  const base = requireApiBase(options);

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw await parseApiError(response, `User API ${response.status}`);
    }

    const payload = await response.json();
    const userRaw = payload.user ?? payload.data?.user ?? payload;
    const sessionRaw = payload.session ?? payload.tokens ?? payload;

    return {
      user: normalizeUser(userRaw),
      session: normalizeSession(sessionRaw),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

async function fetchCurrentUserRemote(session, options = {}) {
  const base = requireApiBase(options);
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me`, {
      signal,
      headers: buildAuthHeaders(session)
    });

    if (!response.ok) {
      throw await parseApiError(response, `User API ${response.status}`);
    }

    const payload = await response.json();
    return {
      user: normalizeUser(payload.user ?? payload.data ?? payload),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

async function fetchUserHomeRemote(session, options = {}) {
  const base = requireApiBase(options);
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me/home`, {
      signal,
      headers: buildAuthHeaders(session)
    });

    if (!response.ok) {
      throw await parseApiError(response, `User API ${response.status}`);
    }

    const payload = await response.json();
    return {
      dashboard: normalizeDashboard(payload.dashboard ?? payload.data ?? payload),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

async function updateProfileRemote(patch, session, options = {}) {
  const base = requireApiBase(options);
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me`, {
      method: "PATCH",
      signal,
      headers: buildAuthHeaders(session, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      throw await parseApiError(response, `User API ${response.status}`);
    }

    const payload = await response.json();
    return {
      user: normalizeUser(payload.user ?? payload.data ?? payload),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

async function updatePreferencesRemote(patch, session, options = {}) {
  const base = requireApiBase(options);
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me/preferences`, {
      method: "PATCH",
      signal,
      headers: buildAuthHeaders(session, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      throw await parseApiError(response, `User API ${response.status}`);
    }

    const payload = await response.json();
    return {
      preferences: normalizePreferences(payload.preferences ?? payload.data ?? payload),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

export async function loginUser(credentials, options = {}) {
  return loginRemote(credentials, options);
}

export async function fetchCurrentUser(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  return fetchCurrentUserRemote(session, options);
}

export async function fetchUserHomeData(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  return fetchUserHomeRemote(session, options);
}

export async function updateUserProfile(patch, session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  return updateProfileRemote(patch, session, options);
}

export async function updateUserPreferences(patch, session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  return updatePreferencesRemote(patch, session, options);
}

export async function logoutUser(session, options = {}) {
  const base = getApiBase(options);
  if (!base || !session?.accessToken) {
    return { ok: true, backend: "remote" };
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      signal,
      headers: buildAuthHeaders(session)
    });

    if (!response.ok) {
      const error = await parseApiError(response, `User API ${response.status}`);
      return { ok: false, backend: "remote", error: error.message };
    }
    return { ok: true, backend: "remote" };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return { ok: false, backend: "remote", error: error.message ?? "Logout failed." };
  } finally {
    dispose();
  }
}
