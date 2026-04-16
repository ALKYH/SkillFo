import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useUser } from "../user/UserContext";

function UserLoginModal({ open, onClose, onSuccess }) {
  const { locale } = useI18n();
  const { login, isBusy, authError } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { t } = useI18n();

  const isZh = locale.startsWith("zh");
  const text = (zh, en) => (isZh ? zh : en);

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
      setIdentifier("");
      setPassword("");
      setLocalError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

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
            <h2>{t("login.signIn")}</h2>
          </div>
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
            X
          </button>
        </header>

        <form className="auth-form" onSubmit={onSubmit}>
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

          <label>
            <span>{t("login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder={t("login.passwordPlaceholder")}
            />
          </label>

          <p className="auth-hint">
            {t("login.authHint")}
          </p>

          {(localError || authError) && <p className="auth-error">{localError || authError}</p>}

          <div className="auth-actions">
            <button type="button" className="auth-btn" onClick={onClose}>
              {t("login.cancel")}
            </button>
            <button type="submit" className="auth-btn primary" disabled={isBusy}>
              {isBusy ? t("login.signingIn") : t("login.signInBtn")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UserLoginModal;
