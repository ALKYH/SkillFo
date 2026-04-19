import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useUser } from "../user/UserContext";

function UserLoginModal({ open, onClose, onSuccess }) {
  const { login, register, isBusy, authError } = useUser();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setMode("login");
      setUsername("");
      setEmail("");
      setDisplayName("");
      setIdentifier("");
      setPassword("");
      setConfirmPassword("");
      setLocalError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (mode === "register") {
      if (!username.trim()) {
        setLocalError(t("login.registerUsernameRequired"));
        return;
      }
      if (username.trim().length < 3) {
        setLocalError(t("login.registerUsernameTooShort"));
        return;
      }
      if (!email.trim()) {
        setLocalError(t("login.registerEmailRequired"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setLocalError(t("login.registerEmailInvalid"));
        return;
      }
      if (password.length < 6) {
        setLocalError(t("login.registerPasswordShort"));
        return;
      }
      if (password !== confirmPassword) {
        setLocalError(t("login.registerPasswordNotMatch"));
        return;
      }

      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined
      });

      if (!result.ok) {
        setLocalError(result.message || t("login.registerFail"));
        return;
      }

      onSuccess?.(result.user);
      onClose?.();
      return;
    }

    if (!identifier.trim()) {
      setLocalError(t("login.identifierNotTrim"));
      return;
    }

    if (password.length < 4) {
      setLocalError(t("login.passwordShort"));
      return;
    }

    const result = await login({
      identifier: identifier.trim(),
      password
    });

    if (!result.ok) {
      setLocalError(result.message || t("login.loginFail"));
      return;
    }

    onSuccess?.(result.user);
    onClose?.();
  };

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("login.userLogin")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="auth-modal-head">
          <div>
            <p className="auth-modal-kicker">{t("login.authKicker")}</p>
            <h2>{mode === "register" ? t("login.registerTitle") : t("login.signIn")}</h2>
          </div>
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
            X
          </button>
        </header>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-actions">
            <button
              type="button"
              className={`auth-btn${mode === "login" ? " primary" : ""}`}
              onClick={() => setMode("login")}
              disabled={isBusy}
            >
              {t("login.modeLogin")}
            </button>
            <button
              type="button"
              className={`auth-btn${mode === "register" ? " primary" : ""}`}
              onClick={() => setMode("register")}
              disabled={isBusy}
            >
              {t("login.modeRegister")}
            </button>
          </div>

          {mode === "register" && (
            <>
              <label>
                <span>{t("login.registerUsername")}</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder={t("login.registerUsernamePlaceholder")}
                />
              </label>

              <label>
                <span>{t("login.registerEmail")}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder={t("login.registerEmailPlaceholder")}
                />
              </label>

              <label>
                <span>{t("login.registerDisplayName")}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="nickname"
                  placeholder={t("login.registerDisplayNamePlaceholder")}
                />
              </label>
            </>
          )}

          {mode === "login" && (
            <label>
              <span>{t("login.name")}</span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder={t("login.namePlaceholder")}
              />
            </label>
          )}

          <label>
            <span>{mode === "register" ? t("login.registerPassword") : t("login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder={mode === "register" ? t("login.registerPasswordPlaceholder") : t("login.passwordPlaceholder")}
            />
          </label>

          {mode === "register" && (
            <label>
              <span>{t("login.registerPasswordConfirm")}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder={t("login.registerPasswordConfirmPlaceholder")}
              />
            </label>
          )}

          <p className="auth-hint">
            {mode === "register" ? t("login.registerHint") : t("login.authHint")}
          </p>

          {(localError || authError) && <p className="auth-error">{localError || authError}</p>}

          <div className="auth-actions">
            <button type="button" className="auth-btn" onClick={onClose}>
              {t("login.cancel")}
            </button>
            <button type="submit" className="auth-btn primary" disabled={isBusy}>
              {mode === "register"
                ? isBusy
                  ? t("login.registering")
                  : t("login.registerBtn")
                : isBusy
                  ? t("login.signingIn")
                  : t("login.signInBtn")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UserLoginModal;
