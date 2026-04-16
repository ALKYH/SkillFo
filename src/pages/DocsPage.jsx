import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

function DocsPage() {
  const { t } = useI18n();
  const location = useLocation();
  const columns = t("docs.columns");
  const rows = t("docs.rows");

  useEffect(() => {
    if (location.hash !== "#command-main") return;
    const target = document.getElementById("command-main");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  return (
    <article className="page">
      <section className="section-headline">
        <p className="section-tag">{t("docs.sectionTag")}</p>
        <h2>{t("docs.title")}</h2>
        <p>{t("docs.copy")}</p>
      </section>

      <section className="terminal-surface" id="command-main">
        <h3>{t("docs.tableTitle")}</h3>
        <div className="command-table">
          <div className="table-head">
            {columns.map((columnName) => (
              <span key={columnName}>{columnName}</span>
            ))}
          </div>
          {rows.map((item) => (
            <div className="table-row" key={item.command}>
              <span>{item.command}</span>
              <span>{item.desc}</span>
              <span>{item.sample}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

export default DocsPage;
