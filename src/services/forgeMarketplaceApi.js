const DEFAULT_TIMEOUT_MS = 5000;

function normalizeListing(item) {
  const payload = item?.payload && typeof item.payload === "object" ? item.payload : {};
  const type = item.type === "node-pack" ? "node-pack" : "template";
  const defaultDeliverable = type === "template" ? "SKILLFO.md" : "Preset Node Library";
  const defaultArtifactKind =
    type === "template" ? "skillfo-template" : "preset-node-library";

  return {
    id: String(item.id ?? ""),
    slug: String(item.slug ?? ""),
    type,
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
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
    visibility: String(item.visibility ?? "public"),
    functionFocus: String(item.functionFocus ?? payload.functionFocus ?? item.category ?? "general"),
    deliverable: String(item.deliverable ?? payload.deliverable ?? defaultDeliverable),
    artifactKind: String(item.artifactKind ?? payload.artifactKind ?? defaultArtifactKind),
    payload
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
    scope: params.scope === "mine" ? "mine" : "public",
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

function normalizeFacetBucket(rawBucket) {
  if (!Array.isArray(rawBucket)) return [];
  return rawBucket.map((entry) => ({
    value: String(entry?.value ?? ""),
    count: Number(entry?.count ?? 0)
  }));
}

function buildWorkshopFromItems(items) {
  const templateCategories = new Map();
  const nodePackCategories = new Map();

  items.forEach((item) => {
    const target = item.type === "template" ? templateCategories : nodePackCategories;
    const current = target.get(item.category) ?? 0;
    target.set(item.category, current + 1);
  });

  const toSortedCategoryList = (collection) =>
    [...collection.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));

  const templateCategoriesList = toSortedCategoryList(templateCategories);
  const nodePackCategoriesList = toSortedCategoryList(nodePackCategories);

  return {
    skillfoTemplates: {
      document: "SKILLFO.md",
      total: items.filter((item) => item.type === "template").length,
      categories: templateCategoriesList
    },
    presetNodeLibraries: {
      document: "Preset Node Library",
      total: items.filter((item) => item.type === "node-pack").length,
      categories: nodePackCategoriesList
    }
  };
}

function normalizeWorkshop(rawWorkshop, items) {
  if (!rawWorkshop || typeof rawWorkshop !== "object") {
    return buildWorkshopFromItems(items);
  }

  const rawSkillfo = rawWorkshop.skillfoTemplates ?? {};
  const rawLibraries = rawWorkshop.presetNodeLibraries ?? {};

  return {
    skillfoTemplates: {
      document: String(rawSkillfo.document ?? "SKILLFO.md"),
      total: Number(rawSkillfo.total ?? 0),
      categories: normalizeFacetBucket(rawSkillfo.categories)
    },
    presetNodeLibraries: {
      document: String(rawLibraries.document ?? "Preset Node Library"),
      total: Number(rawLibraries.total ?? 0),
      categories: normalizeFacetBucket(rawLibraries.categories)
    }
  };
}

function buildQueryString(params = {}) {
  const normalized = normalizeParams(params);
  const search = new URLSearchParams();
  if (normalized.scope !== "public") search.set("scope", normalized.scope);
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

async function parseApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    const message =
      payload?.error?.message ??
      payload?.error ??
      payload?.message ??
      fallbackMessage;
    return new Error(String(message));
  } catch {
    return new Error(fallbackMessage);
  }
}

async function fetchRemoteListings(params, options = {}) {
  const apiBase = options.apiBase ?? import.meta.env.VITE_FORGE_API_BASE_URL;
  if (!apiBase) {
    throw new Error("Forge API base URL is not configured.");
  }

  const base = apiBase.replace(/\/$/, "");
  const normalizedParams = normalizeParams(params);
  const query = buildQueryString(params);
  const url = `${base}/api/forge/listings${query ? `?${query}` : ""}`;
  const { signal, dispose } = createTimeoutSignal(options.signal, options.timeoutMs);
  const accessToken = options?.session?.accessToken ?? options?.accessToken ?? "";
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, { signal, headers });
    if (!response.ok) {
      throw await parseApiError(response, `Forge API ${response.status}`);
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

    const paginationPayload = payload.pagination ?? payload.meta?.pagination ?? payload;
    const facets = {
      categories: normalizeFacetBucket(payload?.facets?.categories),
      tags: normalizeFacetBucket(payload?.facets?.tags),
      sources: normalizeFacetBucket(payload?.facets?.sources),
      complexities: normalizeFacetBucket(payload?.facets?.complexities),
      types: normalizeFacetBucket(payload?.facets?.types)
    };
    const workshop = normalizeWorkshop(payload.workshop, items);

    return {
      items,
      facets,
      pagination: hasBackendPagination
        ? normalizePagination(paginationPayload, items.length, normalizedParams)
        : normalizePagination(null, items.length, normalizedParams),
      lastSync: payload.lastSync ?? new Date().toISOString(),
      workshop,
      backend: "remote"
    };
  } finally {
    dispose();
  }
}

export async function fetchForgeMarketplace(params = {}, options = {}) {
  const normalizedParams = normalizeParams(params);
  return fetchRemoteListings(normalizedParams, options);
}
