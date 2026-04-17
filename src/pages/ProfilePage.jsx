import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { fetchUserHomeData } from "../services/userApi";
import { useUser } from "../user/UserContext";

const EMPTY_PROFILE = {
  displayName: "",
  bio: "",
  location: "",
  website: "",
  company: ""
};

const EMPTY_PREFERENCES = {
  defaultVisibility: "public",
  notifyByEmail: true,
  language: "zh-CN",
  defaultSort: "latest"
};

function ProfilePage() {
  const navigate = useNavigate();
  const { t, formatDateTime } = useI18n();
  const {
    user,
    session,
    backend,
    isAuthenticated,
    isInitializing,
    isBusy,
    logout,
    saveProfile,
    savePreferences,
    refreshUser
  } = useUser();

  const [dashboard, setDashboard] = useState(null);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [homeError, setHomeError] = useState("");
  const [notice, setNotice] = useState("");

  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [preferencesForm, setPreferencesForm] = useState(EMPTY_PREFERENCES);

  useEffect(() => {
    if (!user) {
      setProfileForm(EMPTY_PROFILE);
      return;
    }

    setProfileForm({
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      website: user.website ?? "",
      company: user.company ?? ""
    });
  }, [user]);

  const loadUserHome = useCallback(async () => {
    if (!isAuthenticated || !session?.accessToken) {
      setDashboard(null);
      return;
    }

    setIsLoadingHome(true);
    setHomeError("");
    try {
      const result = await fetchUserHomeData(session);
      setDashboard(result.dashboard);
      setPreferencesForm(result.dashboard.preferences ?? EMPTY_PREFERENCES);
    } catch (error) {
      if (error.name === "AbortError") return;
      setHomeError(error.message || t("profile.errors.loadHomeData"));
    } finally {
      setIsLoadingHome(false);
    }
  }, [isAuthenticated, session, t]);

  useEffect(() => {
    loadUserHome();
  }, [loadUserHome]);

  const stats = dashboard?.stats ?? {
    templates: 0,
    packs: 0,
    likes: 0,
    downloads: 0,
    followers: 0,
    following: 0
  };

  const activity = dashboard?.activity ?? [];
  const templates = dashboard?.templates ?? [];

  const backendBadge = useMemo(() => {
    const source =
      backend === "remote"
        ? t("profile.backend.remote")
        : t("profile.backend.unavailable");
    return `${t("profile.backend.label")}: ${source}`;
  }, [backend, t]);

  const onSubmitProfile = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      const nextUser = await saveProfile(profileForm);
      setProfileForm({
        displayName: nextUser.displayName ?? "",
        bio: nextUser.bio ?? "",
        location: nextUser.location ?? "",
        website: nextUser.website ?? "",
        company: nextUser.company ?? ""
      });
      setNotice(t("profile.notice.profileSaved"));
    } catch (error) {
      setNotice(error.message || t("profile.errors.saveProfile"));
    }
  };

  const onSubmitPreferences = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      const nextPreferences = await savePreferences(preferencesForm);
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              preferences: nextPreferences
            }
          : prev
      );
      setPreferencesForm(nextPreferences);
      setNotice(t("profile.notice.preferencesSaved"));
    } catch (error) {
      setNotice(error.message || t("profile.errors.savePreferences"));
    }
  };

  const onSignOut = async () => {
    await logout();
    navigate("/");
  };

  if (isInitializing) {
    return (
      <article className="page profile-page">
        <p>{t("profile.loadingState")}</p>
      </article>
    );
  }

  if (!isAuthenticated) {
    return (
      <article className="page profile-page">
        <section className="hero-zone profile-hero profile-empty">
          <p className="section-tag">{t("profile.userCenterTag")}</p>
          <h2 className="hero-title">{t("profile.signInRequiredTitle")}</h2>
          <p className="hero-copy">{t("profile.signInHint")}</p>
        </section>
      </article>
    );
  }

  return (
    <article className="page profile-page">
      <section className="hero-zone profile-hero">
        <div className="profile-hero-main">
          <div className="profile-avatar" aria-hidden="true">
            {(user.displayName || user.username || "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="section-tag">{t("profile.userHomepageTag")}</p>
            <h2 className="hero-title">{user.displayName || user.username}</h2>
            <p className="hero-copy">@{user.username} · {user.role}</p>
            <p className="hero-copy">{user.email}</p>
          </div>
        </div>

        <div className="profile-hero-meta">
          <span className="forge-status-pill">{backendBadge}</span>
          <span className="forge-status-pill">
            {t("profile.joinedLabel")}: {formatDateTime(new Date(user.joinedAt))}
          </span>
          {session?.expiresAt && (
            <span className="forge-status-pill">
              {t("profile.sessionExpiresLabel")}: {formatDateTime(new Date(session.expiresAt))}
            </span>
          )}
        </div>

        <div className="hero-actions">
          <button type="button" className="action-btn" onClick={refreshUser} disabled={isBusy}>
            {t("profile.actions.refreshAccount")}
          </button>
          <button type="button" className="action-btn" onClick={loadUserHome} disabled={isLoadingHome}>
            {isLoadingHome ? t("profile.actions.loading") : t("profile.actions.refreshHomeData")}
          </button>
          <button type="button" className="action-btn" onClick={onSignOut} disabled={isBusy}>
            {t("profile.actions.signOut")}
          </button>
        </div>
      </section>

      <section className="profile-stat-grid">
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.templates")}</h3>
          <p>{stats.templates}</p>
        </article>
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.packs")}</h3>
          <p>{stats.packs}</p>
        </article>
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.likes")}</h3>
          <p>{stats.likes}</p>
        </article>
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.downloads")}</h3>
          <p>{stats.downloads}</p>
        </article>
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.followers")}</h3>
          <p>{stats.followers}</p>
        </article>
        <article className="terminal-surface profile-stat-card">
          <h3>{t("profile.stats.following")}</h3>
          <p>{stats.following}</p>
        </article>
      </section>

      {notice && <p className="profile-notice">{notice}</p>}
      {homeError && <p className="profile-notice error">{homeError}</p>}

      <section className="split-zone profile-content-grid">
        <article className="terminal-surface">
          <h3>{t("profile.sections.profile")}</h3>
          <form className="profile-form" onSubmit={onSubmitProfile}>
            <label>
              <span>{t("profile.form.displayName")}</span>
              <input
                value={profileForm.displayName}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("profile.form.bio")}</span>
              <textarea
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("profile.form.location")}</span>
              <input
                value={profileForm.location}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("profile.form.website")}</span>
              <input
                value={profileForm.website}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, website: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("profile.form.company")}</span>
              <input
                value={profileForm.company}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, company: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="action-btn primary" disabled={isBusy}>
              {t("profile.form.saveProfile")}
            </button>
          </form>
        </article>

        <article className="terminal-surface">
          <h3>{t("profile.sections.preferences")}</h3>
          <form className="profile-form" onSubmit={onSubmitPreferences}>
            <label>
              <span>{t("profile.preferences.defaultVisibility")}</span>
              <select
                value={preferencesForm.defaultVisibility}
                onChange={(event) =>
                  setPreferencesForm((prev) => ({ ...prev, defaultVisibility: event.target.value }))
                }
              >
                <option value="public">{t("profile.options.visibility.public")}</option>
                <option value="private">{t("profile.options.visibility.private")}</option>
              </select>
            </label>

            <label>
              <span>{t("profile.preferences.defaultSort")}</span>
              <select
                value={preferencesForm.defaultSort}
                onChange={(event) =>
                  setPreferencesForm((prev) => ({ ...prev, defaultSort: event.target.value }))
                }
              >
                <option value="latest">{t("profile.options.sort.latest")}</option>
                <option value="trending">{t("profile.options.sort.trending")}</option>
                <option value="popular">{t("profile.options.sort.popular")}</option>
                <option value="downloads">{t("profile.options.sort.downloads")}</option>
              </select>
            </label>

            <label>
              <span>{t("profile.preferences.interfaceLanguage")}</span>
              <select
                value={preferencesForm.language}
                onChange={(event) =>
                  setPreferencesForm((prev) => ({ ...prev, language: event.target.value }))
                }
              >
                <option value="zh-CN">{t("profile.options.language.zhCN")}</option>
                <option value="en-US">{t("profile.options.language.enUS")}</option>
              </select>
            </label>

            <label className="profile-checkbox">
              <input
                type="checkbox"
                checked={preferencesForm.notifyByEmail}
                onChange={(event) =>
                  setPreferencesForm((prev) => ({ ...prev, notifyByEmail: event.target.checked }))
                }
              />
              <span>{t("profile.preferences.emailNotifications")}</span>
            </label>

            <button type="submit" className="action-btn primary" disabled={isBusy}>
              {t("profile.preferences.save")}
            </button>
          </form>
        </article>
      </section>

      <section className="split-zone profile-content-grid">
        <article className="terminal-surface">
          <h3>{t("profile.sections.recentActivity")}</h3>
          <ul className="profile-activity-list">
            {activity.map((event) => (
              <li key={event.id}>
                <div>
                  <p>{event.title}</p>
                  <span>{event.type}</span>
                </div>
                <time>{formatDateTime(new Date(event.timestamp))}</time>
              </li>
            ))}
            {activity.length === 0 && <li>{t("profile.empty.noActivity")}</li>}
          </ul>
        </article>

        <article className="terminal-surface">
          <h3>{t("profile.sections.myTemplates")}</h3>
          <div className="command-table profile-table">
            <div className="table-head">
              <span>{t("profile.table.title")}</span>
              <span>{t("profile.table.visibility")}</span>
              <span>{t("profile.table.stats")}</span>
            </div>
            {templates.map((item) => (
              <div className="table-row" key={item.id}>
                <span>{item.title}</span>
                <span>{item.visibility}</span>
                <span>
                  {t("profile.table.likesShort")}: {item.likes} · {t("profile.table.downloadsShort")}: {item.downloads}
                </span>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="table-row">
                <span>{t("profile.empty.noTemplates")}</span>
                <span>-</span>
                <span>-</span>
              </div>
            )}
          </div>
        </article>
      </section>
    </article>
  );
}

export default ProfilePage;
