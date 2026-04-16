import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import TerminalLayout from "./components/TerminalLayout";
import { detectInitialLocale, I18nProvider } from "./i18n/I18nContext";
import DocsPage from "./pages/DocsPage";
import ForgePage from "./pages/ForgePage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import WorkspacePage from "./pages/WorkspacePage";
import { UserProvider } from "./user/UserContext";

const DEFAULT_THEME = "one-dark";
const DEFAULT_LOCALE = "zh-CN";

function App() {
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("skillfo-theme");
    return stored || DEFAULT_THEME;
  });
  const [locale, setLocale] = useState(() => {
    const stored = window.localStorage.getItem("skillfo-locale");
    return stored || detectInitialLocale() || DEFAULT_LOCALE;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("skillfo-theme", theme);
  }, [theme]);
  useEffect(() => {
    window.localStorage.setItem("skillfo-locale", locale);
  }, [locale]);

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <UserProvider>
        <Routes>
          <Route
            element={
              <TerminalLayout
                locale={locale}
                onLocaleChange={setLocale}
                theme={theme}
                onThemeChange={setTheme}
              />
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/forge" element={<ForgePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </UserProvider>
    </I18nProvider>
  );
}

export default App;
