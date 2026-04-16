import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchForgeMarketplace } from "../services/forgeMarketplaceApi";
import { useI18n } from "../i18n/I18nContext";

const SORT_OPTIONS = [
  { value: "latest", labelKey: "forgePage.options.sort.latest" },
  { value: "trending", labelKey: "forgePage.options.sort.trending" },
  { value: "popular", labelKey: "forgePage.options.sort.popular" },
  { value: "downloads", labelKey: "forgePage.options.sort.downloads" },
  { value: "nodes", labelKey: "forgePage.options.sort.nodes" },
  { value: "name", labelKey: "forgePage.options.sort.name" }
];

const PAGE_SIZE_OPTIONS = [12, 24, 48];

function parsePositiveInt(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNodeBound(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return String(parsed);
}

function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

function ForgePage() {
  const { t, formatDateTime } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    return {
      query: searchParams.get("query") ?? "",
      category: searchParams.get("category") ?? "all",
      source: searchParams.get("source") ?? "all",
      complexity: searchParams.get("complexity") ?? "all",
      type: searchParams.get("type") ?? "all",
      sortBy: searchParams.get("sortBy") ?? "latest",
      tags: searchParams.getAll("tags"),
      minNodes: parseNodeBound(searchParams.get("minNodes")),
      maxNodes: parseNodeBound(searchParams.get("maxNodes")),
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: parsePositiveInt(searchParams.get("pageSize"), 12)
    };
  }, [searchParams]);

  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({
    categories: [],
    tags: [],
    sources: [],
    complexities: [],
    types: []
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: filters.pageSize,
    total: 0,
    totalPages: 1
  });
  const [backend, setBackend] = useState("mock");
  const [lastSync, setLastSync] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await fetchForgeMarketplace(
          {
            query: filters.query,
            category: filters.category,
            source: filters.source,
            complexity: filters.complexity,
            type: filters.type,
            sortBy: filters.sortBy,
            tags: filters.tags,
            minNodes: filters.minNodes === "" ? undefined : Number(filters.minNodes),
            maxNodes: filters.maxNodes === "" ? undefined : Number(filters.maxNodes),
            page: filters.page,
            pageSize: filters.pageSize
          },
          { signal: abortController.signal }
        );

        setItems(result.items ?? []);
        setFacets(
          result.facets ?? {
            categories: [],
            tags: [],
            sources: [],
            complexities: [],
            types: []
          }
        );
        setPagination(
          result.pagination ?? {
            page: filters.page,
            pageSize: filters.pageSize,
            total: result.items?.length ?? 0,
            totalPages: 1
          }
        );
        setBackend(result.backend ?? "mock");
        setLastSync(result.lastSync ?? null);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        setError(fetchError.message || t("forgePage.errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [filters, t]);

  const setFilters = (patch, resetPage = true) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([key, value]) => {
      if (key === "tags") {
        next.delete("tags");
        (value ?? []).forEach((tag) => {
          if (tag) next.append("tags", tag);
        });
        return;
      }

      if (value === undefined || value === null || value === "") {
        next.delete(key);
        return;
      }

      if (["category", "source", "complexity", "type"].includes(key) && value === "all") {
        next.delete(key);
        return;
      }

      if (key === "sortBy" && value === "latest") {
        next.delete(key);
        return;
      }

      if (key === "page" && Number(value) <= 1) {
        next.delete("page");
        return;
      }

      if (key === "pageSize" && Number(value) === 12) {
        next.delete("pageSize");
        return;
      }

      next.set(key, String(value));
    });

    if (resetPage && !Object.prototype.hasOwnProperty.call(patch, "page")) {
      next.delete("page");
    }

    setSearchParams(next, { replace: true });
  };

  const toggleTag = (tag) => {
    const nextTags = filters.tags.includes(tag)
      ? filters.tags.filter((item) => item !== tag)
      : [...filters.tags, tag];
    setFilters({ tags: nextTags });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const removeSingleFilter = (key, value) => {
    if (key === "tags") {
      setFilters({ tags: filters.tags.filter((tag) => tag !== value) });
      return;
    }

    if (key === "query") setFilters({ query: "" });
    if (key === "category") setFilters({ category: "all" });
    if (key === "source") setFilters({ source: "all" });
    if (key === "complexity") setFilters({ complexity: "all" });
    if (key === "type") setFilters({ type: "all" });
    if (key === "minNodes") setFilters({ minNodes: "" });
    if (key === "maxNodes") setFilters({ maxNodes: "" });
  };

  const activeFilterPills = useMemo(() => {
    const pills = [];

    if (filters.query) {
      pills.push({
        key: "query",
        value: filters.query,
        label: `${t("forgePage.pills.query")}: ${filters.query}`
      });
    }

    if (filters.category !== "all") {
      pills.push({
        key: "category",
        value: filters.category,
        label: `${t("forgePage.pills.category")}: ${filters.category}`
      });
    }

    if (filters.source !== "all") {
      pills.push({
        key: "source",
        value: filters.source,
        label: `${t("forgePage.pills.source")}: ${filters.source}`
      });
    }

    if (filters.complexity !== "all") {
      pills.push({
        key: "complexity",
        value: filters.complexity,
        label: `${t("forgePage.pills.complexity")}: ${filters.complexity}`
      });
    }

    if (filters.type !== "all") {
      pills.push({
        key: "type",
        value: filters.type,
        label: `${t("forgePage.pills.type")}: ${filters.type}`
      });
    }

    if (filters.minNodes !== "") {
      pills.push({
        key: "minNodes",
        value: filters.minNodes,
        label: `${t("forgePage.pills.minNodes")}: ${filters.minNodes}`
      });
    }

    if (filters.maxNodes !== "") {
      pills.push({
        key: "maxNodes",
        value: filters.maxNodes,
        label: `${t("forgePage.pills.maxNodes")}: ${filters.maxNodes}`
      });
    }

    filters.tags.forEach((tag) => {
      pills.push({ key: "tags", value: tag, label: `#${tag}` });
    });

    return pills;
  }, [filters, t]);

  const pageList = useMemo(
    () => buildPageList(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const topTags = (facets.tags ?? []).slice(0, 16);

  return (
    <article className="page forge-page">
      <section className="hero-zone forge-hero">
        <p className="section-tag">{t("forgePage.sectionTag")}</p>
        <h2 className="hero-title">{t("forgePage.title")}</h2>
        <p className="hero-copy">{t("forgePage.copy")}</p>

        <div className="forge-search-row">
          <input
            className="forge-search-input"
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder={t("forgePage.searchPlaceholder")}
          />
          <button type="button" className="action-btn" onClick={resetFilters}>
            {t("forgePage.reset")}
          </button>
        </div>

        <div className="forge-meta-row">
          <span className="forge-status-pill">
            {backend === "remote"
              ? t("forgePage.backend.connected")
              : t("forgePage.backend.mock")}
          </span>
          <span className="forge-status-pill">
            {t("forgePage.results")}: {pagination.total}
          </span>
          <span className="forge-status-pill">
            {t("forgePage.page")}: {pagination.page}/{pagination.totalPages}
          </span>
          {lastSync && (
            <span className="forge-status-pill">
              {t("forgePage.sync")}: {formatDateTime(new Date(lastSync))}
            </span>
          )}
        </div>
      </section>

      <section className="terminal-surface forge-control-panel">
        <div className="forge-select-grid forge-select-grid-6">
          <label>
            <span>{t("forgePage.filters.category")}</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters({ category: event.target.value })}
            >
              <option value="all">{t("forgePage.options.common.all")}</option>
              {(facets.categories ?? []).map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.value} ({entry.count})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("forgePage.filters.source")}</span>
            <select value={filters.source} onChange={(event) => setFilters({ source: event.target.value })}>
              <option value="all">{t("forgePage.options.common.all")}</option>
              <option value="official">{t("forgePage.options.source.official")}</option>
              <option value="user">{t("forgePage.options.source.user")}</option>
            </select>
          </label>

          <label>
            <span>{t("forgePage.filters.contentType")}</span>
            <select value={filters.type} onChange={(event) => setFilters({ type: event.target.value })}>
              <option value="all">{t("forgePage.options.common.all")}</option>
              <option value="template">{t("forgePage.options.type.template")}</option>
              <option value="node-pack">{t("forgePage.options.type.nodePack")}</option>
            </select>
          </label>

          <label>
            <span>{t("forgePage.filters.complexity")}</span>
            <select
              value={filters.complexity}
              onChange={(event) => setFilters({ complexity: event.target.value })}
            >
              <option value="all">{t("forgePage.options.common.all")}</option>
              <option value="beginner">{t("forgePage.options.complexity.beginner")}</option>
              <option value="intermediate">{t("forgePage.options.complexity.intermediate")}</option>
              <option value="advanced">{t("forgePage.options.complexity.advanced")}</option>
            </select>
          </label>

          <label>
            <span>{t("forgePage.filters.sort")}</span>
            <select value={filters.sortBy} onChange={(event) => setFilters({ sortBy: event.target.value })}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("forgePage.filters.pageSize")}</span>
            <select
              value={filters.pageSize}
              onChange={(event) => setFilters({ pageSize: Number(event.target.value) })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="forge-range-row">
          <label>
            <span>{t("forgePage.filters.minNodes")}</span>
            <input
              type="number"
              min="0"
              value={filters.minNodes}
              onChange={(event) => setFilters({ minNodes: parseNodeBound(event.target.value) })}
              placeholder="0"
            />
          </label>
          <label>
            <span>{t("forgePage.filters.maxNodes")}</span>
            <input
              type="number"
              min="0"
              value={filters.maxNodes}
              onChange={(event) => setFilters({ maxNodes: parseNodeBound(event.target.value) })}
              placeholder="999"
            />
          </label>
        </div>

        <div className="forge-tag-wrap">
          {topTags.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={`forge-tag-btn${filters.tags.includes(entry.value) ? " is-active" : ""}`}
              onClick={() => toggleTag(entry.value)}
            >
              #{entry.value} <span>{entry.count}</span>
            </button>
          ))}
        </div>

        {activeFilterPills.length > 0 && (
          <div className="forge-active-filters">
            {activeFilterPills.map((pill) => (
              <button
                key={`${pill.key}-${pill.value}`}
                type="button"
                className="forge-active-pill"
                onClick={() => removeSingleFilter(pill.key, pill.value)}
              >
                {pill.label} ×
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="forge-list-grid">
        {isLoading && <p className="forge-status-text">{t("forgePage.loading")}</p>}

        {!isLoading && error && <p className="forge-status-text error">{error}</p>}

        {!isLoading && !error && items.length === 0 && (
          <p className="forge-status-text">{t("forgePage.noResults")}</p>
        )}

        {!isLoading &&
          !error &&
          items.map((item) => (
            <article className="forge-card" key={item.id}>
              <header className="forge-card-head">
                <span className={`forge-type-pill is-${item.type}`}>
                  {item.type === "node-pack"
                    ? t("forgePage.options.type.nodePack")
                    : t("forgePage.options.type.template")}
                </span>
                <span className={`forge-source-pill is-${item.source}`}>
                  {item.source === "official"
                    ? t("forgePage.options.source.official")
                    : t("forgePage.options.source.user")}
                </span>
              </header>

              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <div className="forge-metrics">
                <span>{t("forgePage.metrics.author")}: {item.author}</span>
                <span>{t("forgePage.metrics.category")}: {item.category}</span>
                <span>{t("forgePage.metrics.complexity")}: {item.complexity}</span>
                <span>{t("forgePage.metrics.nodes")}: {item.nodeCount}</span>
                <span>{t("forgePage.metrics.likes")}: {item.likes}</span>
                <span>{t("forgePage.metrics.downloads")}: {item.downloads}</span>
              </div>

              <div className="forge-tag-line">
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>

              <footer className="forge-card-foot">
                <span>{formatDateTime(new Date(item.updatedAt))}</span>
                <button type="button" className="action-btn primary small-btn">
                  {t("forgePage.use")}
                </button>
              </footer>
            </article>
          ))}
      </section>

      <section className="terminal-surface forge-pagination-wrap">
        <div className="forge-pagination-left">
          <span>
            {t("forgePage.showing")} {items.length} / {pagination.total}
          </span>
        </div>

        <div className="forge-pagination-right">
          <button
            type="button"
            className="action-btn small-btn"
            disabled={pagination.page <= 1}
            onClick={() => setFilters({ page: pagination.page - 1 }, false)}
          >
            {t("forgePage.prev")}
          </button>

          {pageList.map((page) => (
            <button
              key={page}
              type="button"
              className={`forge-page-btn${page === pagination.page ? " is-active" : ""}`}
              onClick={() => setFilters({ page }, false)}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            className="action-btn small-btn"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters({ page: pagination.page + 1 }, false)}
          >
            {t("forgePage.next")}
          </button>
        </div>
      </section>
    </article>
  );
}

export default ForgePage;
