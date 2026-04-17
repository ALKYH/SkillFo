import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredSession,
  fetchCurrentUser,
  getStoredSession,
  loginUser,
  logoutUser,
  persistSession,
  updateUserPreferences,
  updateUserProfile
} from "../services/userApi";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [user, setUser] = useState(null);
  const [backend, setBackend] = useState("remote");
  const [isInitializing, setIsInitializing] = useState(Boolean(session));
  const [isBusy, setIsBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const hydrateUser = useCallback(async (activeSession) => {
    if (!activeSession?.accessToken) {
      setUser(null);
      return;
    }

    const result = await fetchCurrentUser(activeSession);
    setUser(result.user);
    setBackend(result.backend ?? "remote");
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!session?.accessToken) {
      setIsInitializing(false);
      setUser(null);
      return () => {
        cancelled = true;
      };
    }

    setIsInitializing(true);

    hydrateUser(session)
      .catch(() => {
        if (cancelled) return;
        clearStoredSession();
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrateUser, session]);

  const login = useCallback(async (credentials) => {
    setIsBusy(true);
    setAuthError("");
    try {
      const result = await loginUser(credentials);
      const nextSession = persistSession(result.session);
      setSession(nextSession);
      setUser(result.user);
      setBackend(result.backend ?? "remote");
      return { ok: true, user: result.user };
    } catch (error) {
      const message = error?.message || "Login failed.";
      setAuthError(message);
      return { ok: false, message };
    } finally {
      setIsBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsBusy(true);
    try {
      await logoutUser(session);
    } finally {
      clearStoredSession();
      setSession(null);
      setUser(null);
      setAuthError("");
      setIsBusy(false);
    }
  }, [session]);

  const refreshUser = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsBusy(true);
    try {
      const result = await fetchCurrentUser(session);
      setUser(result.user);
      setBackend(result.backend ?? backend);
    } finally {
      setIsBusy(false);
    }
  }, [backend, session]);

  const saveProfile = useCallback(
    async (patch) => {
      if (!session?.accessToken) {
        throw new Error("Not authenticated.");
      }

      setIsBusy(true);
      try {
        const result = await updateUserProfile(patch, session);
        setUser(result.user);
        setBackend(result.backend ?? backend);
        return result.user;
      } finally {
        setIsBusy(false);
      }
    },
    [backend, session]
  );

  const savePreferences = useCallback(
    async (patch) => {
      if (!session?.accessToken) {
        throw new Error("Not authenticated.");
      }

      setIsBusy(true);
      try {
        const result = await updateUserPreferences(patch, session);
        setBackend(result.backend ?? backend);
        return result.preferences;
      } finally {
        setIsBusy(false);
      }
    },
    [backend, session]
  );

  const value = useMemo(() => {
    const isAuthenticated = Boolean(session?.accessToken && user?.id);
    return {
      user,
      session,
      backend,
      isAuthenticated,
      isInitializing,
      isBusy,
      authError,
      login,
      logout,
      refreshUser,
      saveProfile,
      savePreferences
    };
  }, [
    authError,
    backend,
    isBusy,
    isInitializing,
    login,
    logout,
    refreshUser,
    savePreferences,
    saveProfile,
    session,
    user
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
}
