const DEFAULT_TIMEOUT_MS = 5000;

const MOCK_LISTINGS = [
  {
    id: "tpl-skill-skeleton",
    type: "template",
    title: "SKILL Skeleton",
    description:
      "Metadata + prerequisite + environment + workflow + guardrails baseline.",
    author: "SkillFo Official",
    source: "official",
    category: "foundation",
    complexity: "beginner",
    tags: ["metadata", "guardrails", "skill-md", "starter"],
    nodeCount: 8,
    likes: 289,
    downloads: 4511,
    updatedAt: "2026-04-11T08:30:00Z"
  },
  {
    id: "tpl-agent-debug-loop",
    type: "template",
    title: "Agent Debug Loop",
    description:
      "Condition + loop template for diagnose-fix-verify cycles with stop criteria.",
    author: "SkillFo Official",
    source: "official",
    category: "automation",
    complexity: "intermediate",
    tags: ["condition", "loop", "debug", "verification"],
    nodeCount: 12,
    likes: 171,
    downloads: 2962,
    updatedAt: "2026-04-10T03:10:00Z"
  },
  {
    id: "pack-cli-python-js",
    type: "node-pack",
    title: "CLI + Python + JS Tool Pack",
    description:
      "Reusable tool nodes for shell commands, Python transforms, and JS handlers.",
    author: "SkillFo Official",
    source: "official",
    category: "tooling",
    complexity: "beginner",
    tags: ["cli", "python", "javascript", "tool-node"],
    nodeCount: 6,
    likes: 322,
    downloads: 5890,
    updatedAt: "2026-04-09T14:20:00Z"
  },
  {
    id: "tpl-multi-stage-review",
    type: "template",
    title: "Multi-Stage Review Pipeline",
    description:
      "Draft, review, revise, approve, publish pattern for collaborative content flow.",
    author: "Ivy Chen",
    source: "user",
    category: "content",
    complexity: "intermediate",
    tags: ["review", "pipeline", "approval", "publishing"],
    nodeCount: 14,
    likes: 93,
    downloads: 1212,
    updatedAt: "2026-04-07T22:42:00Z"
  },
  {
    id: "tpl-node-ops-catalog",
    type: "template",
    title: "Node Ops Catalog",
    description:
      "Catalog nodes by domain and wire to reusable import/export skill snippets.",
    author: "Alex Wu",
    source: "user",
    category: "catalog",
    complexity: "advanced",
    tags: ["catalog", "taxonomy", "template-library"],
    nodeCount: 20,
    likes: 56,
    downloads: 704,
    updatedAt: "2026-04-05T09:55:00Z"
  },
  {
    id: "pack-guardrail-suite",
    type: "node-pack",
    title: "Guardrail Suite",
    description:
      "Defensive validation, retry budget, risk scoring, and escalation nodes.",
    author: "Mina Park",
    source: "user",
    category: "safety",
    complexity: "intermediate",
    tags: ["guardrails", "risk", "retry", "validation"],
    nodeCount: 10,
    likes: 145,
    downloads: 2334,
    updatedAt: "2026-04-03T12:00:00Z"
  },
  {
    id: "tpl-knowledge-index",
    type: "template",
    title: "Knowledge Index Builder",
    description:
      "Ingest docs, chunk content, enrich metadata, and publish searchable index.",
    author: "SkillFo Official",
    source: "official",
    category: "data",
    complexity: "advanced",
    tags: ["index", "search", "metadata", "retrieval"],
    nodeCount: 18,
    likes: 111,
    downloads: 1635,
    updatedAt: "2026-04-02T05:21:00Z"
  },
  {
    id: "tpl-oncall-triage",
    type: "template",
    title: "On-Call Incident Triage",
    description:
      "Capture incident signals and route through severity-aware response branches.",
    author: "Riley Novak",
    source: "user",
    category: "operations",
    complexity: "intermediate",
    tags: ["incident", "triage", "oncall", "branching"],
    nodeCount: 13,
    likes: 84,
    downloads: 980,
    updatedAt: "2026-03-30T18:08:00Z"
  },
  {
    id: "pack-metadata-kit",
    type: "node-pack",
    title: "Metadata & Bait Kit",
    description:
      "Fast metadata scaffolding for skill discoverability and prompt alignment.",
    author: "SkillFo Official",
    source: "official",
    category: "foundation",
    complexity: "beginner",
    tags: ["metadata", "bait", "discoverability"],
    nodeCount: 5,
    likes: 74,
    downloads: 1544,
    updatedAt: "2026-03-28T11:40:00Z"
  },
  {
    id: "tpl-batch-refactor",
    type: "template",
    title: "Batch Refactor Coordinator",
    description:
      "Plan, split, apply, and verify multi-module code refactors in controlled stages.",
    author: "Noah G.",
    source: "user",
    category: "automation",
    complexity: "advanced",
    tags: ["refactor", "batch", "codebase", "verification"],
    nodeCount: 22,
    likes: 62,
    downloads: 640,
    updatedAt: "2026-03-25T07:02:00Z"
  },
  {
    id: "tpl-doc-to-runbook",
    type: "template",
    title: "Doc to Runbook",
    description:
      "Convert ad-hoc notes into structured runbooks with checks and escalation.",
    author: "SkillFo Official",
    source: "official",
    category: "content",
    complexity: "beginner",
    tags: ["runbook", "docs", "operations"],
    nodeCount: 9,
    likes: 133,
    downloads: 2105,
    updatedAt: "2026-03-22T13:15:00Z"
  }
];

function normalizeListing(item) {
  return {
    id: String(item.id ?? ""),
    type: item.type === "node-pack" ? "node-pack" : "template",
    title: String(item.title ?? "Untitled"),
    description: String(item.description ?? ""),
    author: String(item.author ?? "Unknown"),
    source: item.source === "official" ? "official" : "user",
    category: String(item.category ?? "misc"),
    complexity: ["beginner", "intermediate", "advanced"].includes(item.complexity)
      ? item.complexity
      : "beginner",
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
    nodeCount: Number(item.nodeCount ?? 0),
    likes: Number(item.likes ?? 0),
    downloads: Number(item.downloads ?? 0),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString()
  };
}

function toFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveInt(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeParams(params = {}) {
  return {
    query: String(params.query ?? ""),
    category: params.category ?? "all",
    source: params.source ?? "all",
    complexity: params.complexity ?? "all",
    type: params.type ?? "all",
    sortBy: params.sortBy ?? "latest",
    tags: Array.isArray(params.tags) ? params.tags : [],
    minNodes: toFiniteNumber(params.minNodes, null),
    maxNodes: toFiniteNumber(params.maxNodes, null),
    page: toPositiveInt(params.page, 1),
    pageSize: toPositiveInt(params.pageSize, 12)
  };
}

function calcTrendingScore(item) {
  const ageMs = Date.now() - new Date(item.updatedAt).getTime();
  const ageDays = Math.max(1, ageMs / (1000 * 60 * 60 * 24));
  const freshness = 40 / ageDays;
  return item.likes * 1.7 + item.downloads * 0.08 + freshness + item.nodeCount * 0.6;
}

function applyFilters(items, params = {}) {
  const normalized = normalizeParams(params);
  const query = normalized.query.trim().toLowerCase();
  const selectedTags = normalized.tags;
  const minNodes = normalized.minNodes;
  const maxNodes = normalized.maxNodes;

  return items.filter((item) => {
    if (
      normalized.category &&
      normalized.category !== "all" &&
      item.category !== normalized.category
    ) {
      return false;
    }

    if (normalized.source && normalized.source !== "all" && item.source !== normalized.source) {
      return false;
    }

    if (
      normalized.complexity &&
      normalized.complexity !== "all" &&
      item.complexity !== normalized.complexity
    ) {
      return false;
    }

    if (normalized.type && normalized.type !== "all" && item.type !== normalized.type) {
      return false;
    }

    if (minNodes !== null && item.nodeCount < minNodes) {
      return false;
    }

    if (maxNodes !== null && item.nodeCount > maxNodes) {
      return false;
    }

    if (
      selectedTags.length > 0 &&
      !selectedTags.every((tag) => item.tags.includes(tag))
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const bucket = [
      item.title,
      item.description,
      item.author,
      item.category,
      item.type,
      ...item.tags
    ]
      .join(" ")
      .toLowerCase();

    return bucket.includes(query);
  });
}

function applySort(items, sortBy = "latest") {
  const sorted = [...items];
  switch (sortBy) {
    case "popular":
      return sorted.sort((a, b) => b.likes - a.likes || b.downloads - a.downloads);
    case "downloads":
      return sorted.sort((a, b) => b.downloads - a.downloads || b.likes - a.likes);
    case "trending":
      return sorted.sort((a, b) => calcTrendingScore(b) - calcTrendingScore(a));
    case "nodes":
      return sorted.sort((a, b) => b.nodeCount - a.nodeCount || b.likes - a.likes);
    case "name":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }
}

function buildFacets(items) {
  const categories = {};
  const tags = {};
  const sources = {};
  const complexities = {};
  const types = {};

  items.forEach((item) => {
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    sources[item.source] = (sources[item.source] ?? 0) + 1;
    complexities[item.complexity] = (complexities[item.complexity] ?? 0) + 1;
    types[item.type] = (types[item.type] ?? 0) + 1;
    item.tags.forEach((tag) => {
      tags[tag] = (tags[tag] ?? 0) + 1;
    });
  });

  return {
    categories: Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count })),
    tags: Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count })),
    sources: Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count })),
    complexities: Object.entries(complexities)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count })),
    types: Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }))
  };
}

function buildQueryString(params = {}) {
  const normalized = normalizeParams(params);
  const search = new URLSearchParams();
  if (normalized.query) search.set("query", normalized.query);
  if (normalized.category && normalized.category !== "all") {
    search.set("category", normalized.category);
  }
  if (normalized.source && normalized.source !== "all") {
    search.set("source", normalized.source);
  }
  if (normalized.complexity && normalized.complexity !== "all") {
    search.set("complexity", normalized.complexity);
  }
  if (normalized.type && normalized.type !== "all") {
    search.set("type", normalized.type);
  }
  if (normalized.sortBy) search.set("sortBy", normalized.sortBy);
  if (normalized.minNodes !== null) search.set("minNodes", String(normalized.minNodes));
  if (normalized.maxNodes !== null) search.set("maxNodes", String(normalized.maxNodes));
  search.set("page", String(normalized.page));
  search.set("pageSize", String(normalized.pageSize));
  normalized.tags.forEach((tag) => search.append("tags", tag));
  return search.toString();
}

function paginateItems(items, params = {}) {
  const normalized = normalizeParams(params);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / normalized.pageSize));
  const page = Math.min(Math.max(1, normalized.page), totalPages);
  const offset = (page - 1) * normalized.pageSize;
  const pagedItems = items.slice(offset, offset + normalized.pageSize);
  return {
    page,
    pageSize: normalized.pageSize,
    total,
    totalPages,
    items: pagedItems
  };
}

function normalizePagination(rawPagination, fallbackTotal, params = {}) {
  const normalized = normalizeParams(params);
  if (!rawPagination) {
    const totalPages = Math.max(1, Math.ceil(fallbackTotal / normalized.pageSize));
    return {
      page: Math.min(normalized.page, totalPages),
      pageSize: normalized.pageSize,
      total: fallbackTotal,
      totalPages
    };
  }

  const pageSize = toPositiveInt(rawPagination.pageSize, normalized.pageSize);
  const total = toPositiveInt(rawPagination.total, fallbackTotal);
  const totalPages = toPositiveInt(
    rawPagination.totalPages,
    Math.max(1, Math.ceil(total / pageSize))
  );
  const page = Math.min(toPositiveInt(rawPagination.page, normalized.page), totalPages);

  return {
    page,
    pageSize,
    total,
    totalPages
  };
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

async function fetchRemoteListings(params, options = {}) {
  const apiBase = options.apiBase ?? import.meta.env.VITE_FORGE_API_BASE_URL;
  if (!apiBase) return null;

  const base = apiBase.replace(/\/$/, "");
  const normalizedParams = normalizeParams(params);
  const query = buildQueryString(params);
  const url = `${base}/api/forge/listings${query ? `?${query}` : ""}`;
  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);

  try {
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Forge API ${response.status}`);
    }

    const payload = await response.json();
    const listings = Array.isArray(payload)
      ? payload
      : payload.listings ?? payload.items ?? [];

    const items = listings.map(normalizeListing);
    const hasBackendPagination = Boolean(
      payload?.pagination ||
      payload?.meta?.pagination ||
      payload?.page ||
      payload?.pageSize
    );

    if (hasBackendPagination) {
      const paginationPayload = payload.pagination ?? payload.meta?.pagination ?? payload;
      return {
        items,
        facets: payload.facets ?? buildFacets(items),
        pagination: normalizePagination(
          paginationPayload,
          items.length,
          normalizedParams
        ),
        lastSync: payload.lastSync ?? new Date().toISOString(),
        backend: "remote"
      };
    }

    const filtered = applyFilters(items, normalizedParams);
    const sorted = applySort(filtered, normalizedParams.sortBy);
    const paginated = paginateItems(sorted, normalizedParams);
    return {
      items: paginated.items,
      facets: payload.facets ?? buildFacets(items),
      pagination: {
        page: paginated.page,
        pageSize: paginated.pageSize,
        total: paginated.total,
        totalPages: paginated.totalPages
      },
      lastSync: payload.lastSync ?? new Date().toISOString(),
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

function getMockListings(params) {
  const normalizedParams = normalizeParams(params);
  const items = MOCK_LISTINGS.map(normalizeListing);
  const filtered = applyFilters(items, normalizedParams);
  const sorted = applySort(filtered, normalizedParams.sortBy);
  const paginated = paginateItems(sorted, normalizedParams);
  return {
    items: paginated.items,
    facets: buildFacets(items),
    pagination: {
      page: paginated.page,
      pageSize: paginated.pageSize,
      total: paginated.total,
      totalPages: paginated.totalPages
    },
    lastSync: new Date().toISOString(),
    backend: "mock"
  };
}

export async function fetchForgeMarketplace(params = {}, options = {}) {
  const normalizedParams = normalizeParams(params);
  try {
    const remote = await fetchRemoteListings(normalizedParams, options);
    if (remote) {
      return remote;
    }
    return getMockListings(normalizedParams);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    return getMockListings(normalizedParams);
  }
}
