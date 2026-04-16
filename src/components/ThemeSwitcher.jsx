import { IDE_THEMES } from "../data/themes";
import { useI18n } from "../i18n/I18nContext";

function ThemeSwitcher({ value, onChange }) {
  const { t } = useI18n();

  return (
    <label className="control-switcher">
      <span className="control-label">{t("app.themeLabel")}</span>
      <select
        aria-label={t("app.themeLabel")}
        className="control-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {IDE_THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ThemeSwitcher;
