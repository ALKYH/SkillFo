const DEFAULT_TIMEOUT_MS = 7000;
const SESSION_STORAGE_KEY = "skillfo-user-session-v1";
const MOCK_NETWORK_DELAY_MS = 220;

const DEMO_USER = {
  id: "usr-demo-001",
  username: "craftpilot",
  displayName: "Craft Pilot",
  email: "craftpilot@skillfo.dev",
  role: "creator",
  bio: "I build reusable node packs and workflow templates for automation teams.",
  location: "Shanghai",
  website: "https://skillfo.dev/u/craftpilot",
  company: "SkillFo Labs",
  joinedAt: "2025-08-03T04:20:00Z",
  lastLoginAt: new Date().toISOString()
};

const DEMO_DASHBOARD = {
  stats: {
    templates: 24,
    packs: 11,
    likes: 1920,
    downloads: 12480,
    followers: 456,
    following: 97
  },
  activity: [
    {
      id: "act-001",
      type: "publish",
      title: "Published template: Incident Triage Ladder",
      timestamp: "2026-04-14T10:40:00Z"
    },
    {
      id: "act-002",
      type: "update",
      title: "Updated node pack: Guardrail Essentials",
      timestamp: "2026-04-12T02:16:00Z"
    },
    {
      id: "act-003",
      type: "milestone",
      title: "Reached 10k total downloads",
      timestamp: "2026-04-08T07:28:00Z"
    }
  ],
  templates: [
    {
      id: "tpl-user-01",
      title: "Incident Triage Ladder",
      visibility: "public",
      likes: 232,
      downloads: 1804,
      updatedAt: "2026-04-14T10:40:00Z"
    },
    {
      id: "tpl-user-02",
      title: "Release Checklist Runner",
      visibility: "public",
      likes: 177,
      downloads: 1312,
      updatedAt: "2026-04-11T03:02:00Z"
    },
    {
      id: "tpl-user-03",
      title: "Ops Notes to Runbook",
      visibility: "private",
      likes: 51,
      downloads: 294,
      updatedAt: "2026-04-06T12:54:00Z"
    }
  ],
  preferences: {
    defaultVisibility: "public",
    notifyByEmail: true,
    language: "zh-CN",
    defaultSort: "latest"
  }
};

const mockState = {
  user: { ...DEMO_USER },
  dashboard: JSON.parse(JSON.stringify(DEMO_DASHBOARD))
};

function wait(ms = MOCK_NETWORK_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toIso(value, fallback = new Date().toISOString()) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
    joinedAt: toIso(raw.joinedAt, DEMO_USER.joinedAt),
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

async function loginRemote(credentials, options = {}) {
  const base = getApiBase(options);
  if (!base) return null;

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
      throw new Error(`User API ${response.status}`);
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
  const base = getApiBase(options);
  if (!base || !session?.accessToken) return null;

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me`, {
      signal,
      headers: buildAuthHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`User API ${response.status}`);
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
  const base = getApiBase(options);
  if (!base || !session?.accessToken) return null;

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(`${base}/api/users/me/home`, {
      signal,
      headers: buildAuthHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`User API ${response.status}`);
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
  const base = getApiBase(options);
  if (!base || !session?.accessToken) return null;

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
      throw new Error(`User API ${response.status}`);
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
  const base = getApiBase(options);
  if (!base || !session?.accessToken) return null;

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
      throw new Error(`User API ${response.status}`);
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

function mockSession() {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const accessToken = `mock_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return { accessToken, refreshToken: "", expiresAt };
}

async function loginMock(credentials = {}) {
  const identifier = String(credentials.identifier ?? "").trim();
  const password = String(credentials.password ?? "");

  await wait();

  if (!identifier) {
    throw new Error("Please enter username or email.");
  }

  if (password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const lower = identifier.toLowerCase();
  const nextUser = {
    ...mockState.user,
    username: lower.includes("@") ? lower.split("@")[0] : lower,
    displayName: identifier,
    email: lower.includes("@") ? lower : `${lower}@skillfo.dev`,
    lastLoginAt: new Date().toISOString()
  };

  mockState.user = normalizeUser(nextUser);

  return {
    user: clone(mockState.user),
    session: mockSession(),
    backend: "mock"
  };
}

async function fetchCurrentUserMock() {
  await wait(120);
  return {
    user: clone(mockState.user),
    backend: "mock"
  };
}

async function fetchUserHomeMock() {
  await wait(180);
  return {
    dashboard: normalizeDashboard(mockState.dashboard),
    backend: "mock"
  };
}

async function updateProfileMock(patch = {}) {
  await wait(180);
  mockState.user = normalizeUser({
    ...mockState.user,
    displayName: patch.displayName ?? mockState.user.displayName,
    bio: patch.bio ?? mockState.user.bio,
    location: patch.location ?? mockState.user.location,
    website: patch.website ?? mockState.user.website,
    company: patch.company ?? mockState.user.company
  });

  return {
    user: clone(mockState.user),
    backend: "mock"
  };
}

async function updatePreferencesMock(patch = {}) {
  await wait(180);
  const nextPreferences = normalizePreferences({
    ...mockState.dashboard.preferences,
    ...patch
  });

  mockState.dashboard = {
    ...mockState.dashboard,
    preferences: nextPreferences
  };

  return {
    preferences: clone(nextPreferences),
    backend: "mock"
  };
}

export async function loginUser(credentials, options = {}) {
  try {
    const remote = await loginRemote(credentials, options);
    if (remote?.session?.accessToken) {
      return remote;
    }
    return loginMock(credentials);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return loginMock(credentials);
  }
}

export async function fetchCurrentUser(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  try {
    const remote = await fetchCurrentUserRemote(session, options);
    if (remote?.user?.id) {
      return remote;
    }
    return fetchCurrentUserMock();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return fetchCurrentUserMock();
  }
}

export async function fetchUserHomeData(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  try {
    const remote = await fetchUserHomeRemote(session, options);
    if (remote?.dashboard) {
      return remote;
    }
    return fetchUserHomeMock();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return fetchUserHomeMock();
  }
}

export async function updateUserProfile(patch, session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  try {
    const remote = await updateProfileRemote(patch, session, options);
    if (remote?.user) {
      return remote;
    }
    return updateProfileMock(patch);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return updateProfileMock(patch);
  }
}

export async function updateUserPreferences(patch, session, options = {}) {
  if (!session?.accessToken) {
    throw new Error("Missing session token.");
  }

  try {
    const remote = await updatePreferencesRemote(patch, session, options);
    if (remote?.preferences) {
      return remote;
    }
    return updatePreferencesMock(patch);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return updatePreferencesMock(patch);
  }
}

export async function logoutUser(session, options = {}) {
  const base = getApiBase(options);
  if (!base || !session?.accessToken) {
    return { ok: true, backend: "mock" };
  }

  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      signal,
      headers: buildAuthHeaders(session)
    });
    return { ok: true, backend: "remote" };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return { ok: true, backend: "mock" };
  } finally {
    dispose();
  }
}
