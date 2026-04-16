import { useI18n } from "../i18n/I18nContext";

function LanguageSwitcher({ value, onChange }) {
  const { supportedLocales, t } = useI18n();

  return (
    <label className="control-switcher">
      <span className="control-label">{t("app.languageLabel")}</span>
      <select
        aria-label={t("app.languageLabel")}
        className="control-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {supportedLocales.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
