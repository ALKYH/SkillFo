import { normalizeLang } from "../../utils/markdownRenderUtils";
import nodeEditorConfig from "./nodeEditorConfig.json";

const NODE_W = 196;
const NODE_H = 72;
const DEFAULT_NODE_COLOR = "#61afef";
const RESERVED_PARAM_KEYS = new Set(["color", "summary", "items", "folderId", "referenceOnly", "referenceNotes"]);
const NODE_ITEM_TYPES = ["list", "ordered", "code", "table", "ifelse"];
const TABLE_SIZE_MIN = 1;
const TABLE_SIZE_MAX = 12;
const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLS = 2;
const DEFAULT_IFELSE_CONDITION = "condition";
const DEFAULT_IFELSE_THEN_LINE = "action when true";
const DEFAULT_IFELSE_ELSE_LINE = "action when false";
const REFERENCE_ESCAPE_REGEX = /_@(\d+)\$_/g;
const SKILLFO_FORMAT = "skillfo.workspace.snapshot";
const SKILLFO_FORMAT_VERSION = "1.0.0";
const SKILLFO_PAYLOAD_START = "<!-- SKILLFO_WORKSPACE_PAYLOAD_START -->";
const SKILLFO_PAYLOAD_END = "<!-- SKILLFO_WORKSPACE_PAYLOAD_END -->";
const CODE_LANGUAGE_OPTIONS = [
  "text",
  "javascript",
  "typescript",
  "python",
  "bash",
  "json",
  "yaml",
  "markdown"
];
const DEFAULT_SKILL_METADATA = {
  skillName: "My Skill",
  description: "Describe what this skill is for."
};

function normalizeSkillMetadata(metadata) {
  const source = metadata ?? {};
  return {
    skillName: String(source.skillName ?? DEFAULT_SKILL_METADATA.skillName),
    description: String(source.description ?? DEFAULT_SKILL_METADATA.description)
  };
}

function nodeItemId(seed = 0) {
  return `item-${Date.now().toString(36)}-${seed}-${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeNodeColor(value, fallback = DEFAULT_NODE_COLOR) {
  const color = String(value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
  return fallback;
}

function humanizeParamKey(key) {
  const raw = String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!raw) return "Item";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeItemContent(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeItemType(value) {
  const type = String(value || "").trim().toLowerCase();
  return NODE_ITEM_TYPES.includes(type) ? type : "list";
}

function clampItemTableSize(value, fallback) {
  const parsed = Number(value);
  const basis = Number.isFinite(parsed) ? parsed : fallback;
  const normalized = Math.round(basis);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(TABLE_SIZE_MAX, Math.max(TABLE_SIZE_MIN, normalized));
}

function toTableCellString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function createDefaultTableData(rows, cols) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => (rowIndex === 0 ? `Column ${colIndex + 1}` : ""))
  );
}

function normalizeTableDataShape(rawData, rows, cols, fallbackRows = []) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => {
      const directValue = Array.isArray(rawData) && Array.isArray(rawData[rowIndex])
        ? rawData[rowIndex][colIndex]
        : undefined;
      if (directValue !== undefined && directValue !== null) return toTableCellString(directValue);

      const fallbackValue = Array.isArray(fallbackRows) && Array.isArray(fallbackRows[rowIndex])
        ? fallbackRows[rowIndex][colIndex]
        : undefined;
      if (fallbackValue !== undefined && fallbackValue !== null) return toTableCellString(fallbackValue);

      return rowIndex === 0 ? `Column ${colIndex + 1}` : "";
    })
  );
}

function isMarkdownTableSeparator(cells) {
  if (!Array.isArray(cells) || !cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(String(cell || "").replace(/\s+/g, "")));
}

function parseTableRowsFromContent(content) {
  const lines = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  if (lines.some((line) => line.includes("|"))) {
    const rows = lines
      .filter((line) => line.includes("|"))
      .map((line) =>
        line
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => toTableCellString(cell).replace(/\\\|/g, "|"))
      )
      .filter((cells) => cells.length > 0);

    if (rows[1] && isMarkdownTableSeparator(rows[1])) {
      rows.splice(1, 1);
    }

    return rows;
  }

  return lines.map((line) => line.split(",").map((part) => toTableCellString(part)));
}

function tableRowsToMarkdown(tableData, cols) {
  const rowList = Array.isArray(tableData) ? tableData : [];
  const width = Math.max(
    TABLE_SIZE_MIN,
    Number(cols) || 0,
    rowList.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
  );

  const normalizedRows = rowList.length ? rowList : createDefaultTableData(DEFAULT_TABLE_ROWS, width);
  const header = Array.from({ length: width }, (_, colIndex) => toTableCellString(normalizedRows[0]?.[colIndex]));
  const bodyRows = normalizedRows.length > 1
    ? normalizedRows.slice(1)
    : [Array.from({ length: width }, () => "")];

  const toMarkdownRow = (row) =>
    `| ${Array.from({ length: width }, (_, colIndex) =>
      toTableCellString(row?.[colIndex]).replace(/\|/g, "\\|")
    ).join(" | ")} |`;

  return [
    toMarkdownRow(header),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...bodyRows.map((row) => toMarkdownRow(row))
  ].join("\n");
}

function normalizeTableItemPayload(item = {}) {
  const parsedRows = parseTableRowsFromContent(item.content);
  const parsedRowCount = parsedRows.length || DEFAULT_TABLE_ROWS;
  const parsedColCount = parsedRows.reduce((max, row) => Math.max(max, row.length), 0) || DEFAULT_TABLE_COLS;
  const tableRows = clampItemTableSize(item.tableRows, parsedRowCount);
  const tableCols = clampItemTableSize(item.tableCols, parsedColCount);
  const seedRows = parsedRows.length ? parsedRows : createDefaultTableData(tableRows, tableCols);
  const tableData = normalizeTableDataShape(item.tableData, tableRows, tableCols, seedRows);
  return {
    tableRows,
    tableCols,
    tableData,
    content: tableRowsToMarkdown(tableData, tableCols)
  };
}

function stripListMarkerPrefix(value) {
  return String(value ?? "")
    .trim()
    .replace(/^([-*+]|\d+\.)\s+/, "")
    .trim();
}

function normalizeIfElseBranchLines(value, fallbackLine = "") {
  const sourceLines = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : String(value ?? "").split("\n");
  const lines = sourceLines.map((line) => stripListMarkerPrefix(line)).filter(Boolean);
  if (lines.length) return lines;
  const fallback = stripListMarkerPrefix(fallbackLine);
  return fallback ? [fallback] : [];
}

function parseIfElseContent(content) {
  const lines = String(content ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      condition: "",
      thenLines: [],
      elseLines: []
    };
  }

  let condition = "";
  const thenLines = [];
  const elseLines = [];
  let mode = "then";

  lines.forEach((line, index) => {
    const ifMatch = line.match(/^IF\s*:\s*(.*)$/i);
    if (ifMatch) {
      condition = ifMatch[1].trim();
      mode = "then";
      return;
    }

    if (/^THEN\s*:?\s*$/i.test(line)) {
      mode = "then";
      return;
    }

    const thenInlineMatch = line.match(/^THEN\s*:\s*(.*)$/i);
    if (thenInlineMatch) {
      mode = "then";
      const text = stripListMarkerPrefix(thenInlineMatch[1]);
      if (text) thenLines.push(text);
      return;
    }

    if (/^ELSE\s*:?\s*$/i.test(line)) {
      mode = "else";
      return;
    }

    const elseInlineMatch = line.match(/^ELSE\s*:\s*(.*)$/i);
    if (elseInlineMatch) {
      mode = "else";
      const text = stripListMarkerPrefix(elseInlineMatch[1]);
      if (text) elseLines.push(text);
      return;
    }

    if (line === "---") {
      mode = "else";
      return;
    }

    if (!condition && index === 0) {
      condition = stripListMarkerPrefix(line);
      return;
    }

    const text = stripListMarkerPrefix(line);
    if (!text) return;
    if (mode === "else") {
      elseLines.push(text);
      return;
    }
    thenLines.push(text);
  });

  return { condition, thenLines, elseLines };
}

function ifElsePayloadToContent({ condition, thenLines, elseLines }) {
  const safeCondition = String(condition ?? "").trim() || DEFAULT_IFELSE_CONDITION;
  const safeThenLines = normalizeIfElseBranchLines(thenLines, DEFAULT_IFELSE_THEN_LINE);
  const safeElseLines = normalizeIfElseBranchLines(elseLines, DEFAULT_IFELSE_ELSE_LINE);
  return [
    `IF: ${safeCondition}`,
    "THEN:",
    ...safeThenLines.map((line) => `- ${line}`),
    "ELSE:",
    ...safeElseLines.map((line) => `- ${line}`)
  ].join("\n");
}

function normalizeIfElseItemPayload(item = {}) {
  const parsed = parseIfElseContent(item.content);
  const condition = String(item.ifCondition ?? parsed.condition ?? "").trim() || DEFAULT_IFELSE_CONDITION;
  const thenLines = normalizeIfElseBranchLines(item.ifThen ?? parsed.thenLines, DEFAULT_IFELSE_THEN_LINE);
  const elseLines = normalizeIfElseBranchLines(item.ifElse ?? parsed.elseLines, DEFAULT_IFELSE_ELSE_LINE);
  return {
    ifCondition: condition,
    ifThen: thenLines.join("\n"),
    ifElse: elseLines.join("\n"),
    content: ifElsePayloadToContent({ condition, thenLines, elseLines })
  };
}

function createNodeItem(overrides = {}, index = 0) {
  const type = normalizeItemType(overrides.type);
  const content = normalizeItemContent(overrides.content ?? overrides.value ?? "");
  const base = {
    id: String(overrides.id ?? nodeItemId(index + 1)),
    title: String(overrides.title ?? overrides.label ?? ""),
    type,
    applied: overrides.applied !== false
  };

  if (type === "code") {
    return {
      ...base,
      language: normalizeLang(overrides.language ?? overrides.lang ?? "text"),
      content: normalizeItemContent(overrides.content ?? overrides.code ?? overrides.value ?? "")
    };
  }

  if (type === "ifelse") {
    return {
      ...base,
      ...normalizeIfElseItemPayload({ ...overrides, content })
    };
  }

  if (type === "table") {
    return {
      ...base,
      ...normalizeTableItemPayload({ ...overrides, content })
    };
  }

  return {
    ...base,
    content
  };
}

function normalizeNodeItems(items, fallbackItem = null) {
  const normalized = Array.isArray(items)
    ? items.map((item, index) => createNodeItem(item, index))
    : [];
  if (normalized.length) return normalized;
  if (!fallbackItem) return [];
  return [createNodeItem(fallbackItem, 0)];
}

function normalizeReferenceNotesMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  Object.entries(value).forEach(([key, rawValue]) => {
    const index = Number(key);
    if (!Number.isInteger(index) || index <= 0) return;
    const text = String(rawValue ?? "");
    if (!text.trim()) return;
    result[String(index)] = text;
  });
  return result;
}

function buildGenericNodeDefaults(color, summary, items, options = {}) {
  return {
    color,
    summary,
    items: normalizeNodeItems(items),
    referenceOnly: options.referenceOnly === true,
    referenceNotes: normalizeReferenceNotesMap(options.referenceNotes)
  };
}

function normalizeLocalizedText(value, fallback = { zh: "", en: "" }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const zh = String(value.zh ?? value.cn ?? fallback.zh ?? fallback.en ?? "");
    const en = String(value.en ?? fallback.en ?? fallback.zh ?? "");
    return { zh, en };
  }

  const text = String(value ?? fallback.en ?? fallback.zh ?? "");
  return { zh: text, en: text };
}

function normalizeNodeType(value, fallback = "workflow") {
  const raw = String(value ?? "")
    .trim();
  const normalized = raw
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function buildChipFromType(type) {
  const normalized = String(type ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return normalized.slice(0, 5) || "NODE";
}

function normalizeNodeDefinition(rawDefinition = {}, fallbackType = "workflow") {
  const source =
    rawDefinition && typeof rawDefinition === "object" && !Array.isArray(rawDefinition)
      ? rawDefinition
      : {};
  const type = normalizeNodeType(source.type, fallbackType);
  const fallbackTitle = humanizeParamKey(type);
  const title = normalizeLocalizedText(source.title, { zh: fallbackTitle, en: fallbackTitle });
  const label = normalizeLocalizedText(source.label ?? source.title, title);
  const chip = String(source.chip ?? buildChipFromType(type)).trim() || buildChipFromType(type);
  const color = sanitizeNodeColor(source.color, DEFAULT_NODE_COLOR);

  const defaultsSource =
    source.defaults && typeof source.defaults === "object" && !Array.isArray(source.defaults)
      ? source.defaults
      : {};
  const summary = String(defaultsSource.summary ?? source.summary ?? "Custom node module.");
  const defaultItems = Array.isArray(defaultsSource.items)
    ? defaultsSource.items
    : Array.isArray(source.items)
      ? source.items
      : [{ title: "Details", content: "" }];
  const defaultColor = sanitizeNodeColor(defaultsSource.color, color);

  return {
    chip,
    title,
    label,
    color,
    defaults: () =>
      buildGenericNodeDefaults(defaultColor, summary, defaultItems, {
        referenceOnly: defaultsSource.referenceOnly,
        referenceNotes: defaultsSource.referenceNotes
      })
  };
}

function toNodeTypeEntries(rawNodeTypes) {
  if (Array.isArray(rawNodeTypes)) return rawNodeTypes;
  if (rawNodeTypes && typeof rawNodeTypes === "object") {
    return Object.entries(rawNodeTypes).map(([type, definition]) => ({
      ...(definition && typeof definition === "object" ? definition : {}),
      type
    }));
  }
  return [];
}

function ensureNodeTypeDefinition(nodeLibrary, rawType, rawDefinition = null) {
  const type = normalizeNodeType(rawType, "workflow");
  if (!nodeLibrary[type]) {
    nodeLibrary[type] = normalizeNodeDefinition(
      {
        ...(rawDefinition && typeof rawDefinition === "object" ? rawDefinition : {}),
        type
      },
      type
    );
  }
  return nodeLibrary[type];
}

function buildNodeLibrary(rawNodeTypes) {
  const nodeLibrary = {};

  toNodeTypeEntries(rawNodeTypes).forEach((entry, index) => {
    const type = normalizeNodeType(entry?.type, `custom-${index + 1}`);
    nodeLibrary[type] = normalizeNodeDefinition(entry, type);
  });

  [
    "metadata",
    "workflow",
    "prereq",
    "env",
    "guardrail",
    "cli",
    "python",
    "js",
    "condition",
    "loop"
  ].forEach((type) => ensureNodeTypeDefinition(nodeLibrary, type));

  return nodeLibrary;
}

function normalizePresetTemplateNode(rawTemplate, index, nodeLibrary) {
  if (!rawTemplate || typeof rawTemplate !== "object") return null;

  const fallbackKey = `node-${index + 1}`;
  const key = String(rawTemplate.key ?? fallbackKey).trim() || fallbackKey;
  const type = normalizeNodeType(rawTemplate.type, "workflow");
  ensureNodeTypeDefinition(nodeLibrary, type, rawTemplate.definition ?? rawTemplate.nodeType);
  const definition = nodeLibrary[type] ?? nodeLibrary.workflow;
  const label = normalizeLocalizedText(rawTemplate.label, definition?.label);
  const params =
    rawTemplate.params && typeof rawTemplate.params === "object" && !Array.isArray(rawTemplate.params)
      ? rawTemplate.params
      : {};

  return {
    key,
    type,
    dx: num(rawTemplate.dx, 0),
    dy: num(rawTemplate.dy, 0),
    label,
    params
  };
}

function normalizePreset(rawPreset, index, nodeLibrary) {
  if (!rawPreset || typeof rawPreset !== "object") return null;

  const id = String(rawPreset.id ?? `preset-${index + 1}`).trim() || `preset-${index + 1}`;
  const title = normalizeLocalizedText(rawPreset.title, {
    zh: `预设 ${index + 1}`,
    en: `Preset ${index + 1}`
  });
  const desc = normalizeLocalizedText(rawPreset.desc ?? rawPreset.description, { zh: "", en: "" });

  const usedKeys = new Set();
  const nodes = (Array.isArray(rawPreset.nodes) ? rawPreset.nodes : [])
    .map((template, templateIndex) => {
      const normalized = normalizePresetTemplateNode(template, templateIndex, nodeLibrary);
      if (!normalized) return null;

      let nextKey = normalized.key;
      if (usedKeys.has(nextKey)) nextKey = `${nextKey}-${templateIndex + 1}`;
      usedKeys.add(nextKey);
      return { ...normalized, key: nextKey };
    })
    .filter(Boolean);

  if (!nodes.length) return null;

  const keySet = new Set(nodes.map((node) => node.key));
  const edges = (Array.isArray(rawPreset.edges) ? rawPreset.edges : [])
    .map((edge) => {
      if (!edge || typeof edge !== "object") return null;
      const from = String(edge.from ?? "").trim();
      const to = String(edge.to ?? "").trim();
      if (!keySet.has(from) || !keySet.has(to)) return null;

      return {
        from,
        to,
        kind: String(edge.kind ?? "default").trim() || "default"
      };
    })
    .filter(Boolean);

  const requestedEntry = String(rawPreset.entry ?? "").trim();
  const entry = keySet.has(requestedEntry) ? requestedEntry : nodes[0].key;

  return { id, title, desc, entry, nodes, edges };
}

function buildFallbackPreset(nodeLibrary) {
  ["prereq", "env", "workflow", "guardrail"].forEach((type) => ensureNodeTypeDefinition(nodeLibrary, type));
  return {
    id: "skillSkeleton",
    title: { zh: "基础技能骨架", en: "Skill Skeleton" },
    desc: { zh: "Prereq + Env + Workflow + Guardrails", en: "Prereq + Env + Workflow + Guardrails" },
    entry: "pre",
    nodes: [
      { key: "pre", type: "prereq", dx: 0, dy: 22, label: normalizeLocalizedText("Prerequisite") },
      { key: "env", type: "env", dx: 250, dy: 22, label: normalizeLocalizedText("Environment") },
      { key: "flow", type: "workflow", dx: 500, dy: 22, label: normalizeLocalizedText("Core Workflow") },
      { key: "safe", type: "guardrail", dx: 750, dy: 22, label: normalizeLocalizedText("Guardrails") }
    ],
    edges: [
      { from: "pre", to: "env", kind: "default" },
      { from: "env", to: "flow", kind: "default" },
      { from: "flow", to: "safe", kind: "default" }
    ]
  };
}

function buildPresetLibrary(rawPresets, nodeLibrary) {
  const presets = (Array.isArray(rawPresets) ? rawPresets : [])
    .map((preset, index) => normalizePreset(preset, index, nodeLibrary))
    .filter(Boolean);

  if (presets.length) return presets;
  return [buildFallbackPreset(nodeLibrary)];
}

const NODE_LIBRARY = buildNodeLibrary(nodeEditorConfig?.nodeTypes);
const PRESETS = buildPresetLibrary(nodeEditorConfig?.presets, NODE_LIBRARY);

const EDGE_LABEL = { default: "next", true: "true", false: "false", loop: "loop", exit: "exit" };

const INITIAL_GRAPH = {
  metadata: normalizeSkillMetadata(),
  nodes: [
    { id: "pre1", type: "prereq", label: "Prerequisite", x: 54, y: 80, params: NODE_LIBRARY.prereq.defaults() },
    { id: "env1", type: "env", label: "Environment", x: 304, y: 80, params: NODE_LIBRARY.env.defaults() },
    { id: "flow1", type: "workflow", label: "Core Workflow", x: 554, y: 80, params: NODE_LIBRARY.workflow.defaults() },
    { id: "safe1", type: "guardrail", label: "Guardrails", x: 804, y: 230, params: NODE_LIBRARY.guardrail.defaults() }
  ],
  edges: [
    { id: "e1", from: "pre1", to: "env1", kind: "default" },
    { id: "e2", from: "env1", to: "flow1", kind: "default" },
    { id: "e3", from: "flow1", to: "safe1", kind: "default" }
  ],
  folders: [],
  selectedNodeId: "pre1",
  selectedFolderId: null
};

const DRAG_GRID = 6;

function normalizeNodeParams(rawParams, definition) {
  const defaults = definition?.defaults?.() ?? buildGenericNodeDefaults(
    definition?.color ?? DEFAULT_NODE_COLOR,
    "",
    [{ title: "Details", content: "" }]
  );
  const source = rawParams ?? {};
  const legacyItems = Object.entries(source)
    .filter(([key]) => !RESERVED_PARAM_KEYS.has(key))
    .map(([key, value], index) =>
      createNodeItem({ title: humanizeParamKey(key), content: normalizeItemContent(value) }, index)
    )
    .filter((item) => item.title || item.content);
  const items = Array.isArray(source.items)
    ? normalizeNodeItems(source.items)
    : legacyItems.length
      ? normalizeNodeItems(legacyItems)
      : normalizeNodeItems(defaults.items);

  const normalized = {
    color: sanitizeNodeColor(source.color, sanitizeNodeColor(defaults.color, DEFAULT_NODE_COLOR)),
    summary: String(source.summary ?? defaults.summary ?? ""),
    items,
    referenceOnly: Boolean(source.referenceOnly ?? defaults.referenceOnly ?? false),
    referenceNotes: normalizeReferenceNotesMap(source.referenceNotes ?? defaults.referenceNotes)
  };

  if (source.folderId) normalized.folderId = source.folderId;
  return normalized;
}

function cloneNodeParams(params, definition) {
  const normalized = normalizeNodeParams(params, definition);
  return {
    ...normalized,
    items: normalized.items.map((item) => ({ ...item })),
    referenceNotes: { ...(normalized.referenceNotes ?? {}) }
  };
}

function cloneGraph(graph) {
  return {
    metadata: normalizeSkillMetadata(graph.metadata),
    nodes: graph.nodes.map((n) => ({
      ...n,
      params: cloneNodeParams(n.params, NODE_LIBRARY[n.type] ?? NODE_LIBRARY.workflow)
    })),
    edges: enforceSingleOutgoingEdges(graph.edges).map((e) => ({ ...e })),
    folders: (graph.folders ?? []).map((f) => ({ ...f, nodeIds: [...f.nodeIds] })),
    selectedNodeId: graph.selectedNodeId,
    selectedFolderId: graph.selectedFolderId ?? null
  };
}

function pick(value, isZh) {
  return typeof value === "object" ? (isZh ? value.zh : value.en) : value;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nodeId(type, idx = 0) {
  return `${type}-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
}

function edgeId() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getEdgeSourcePort(edge) {
  const parsed = Number(edge?.sourcePort);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  return 0;
}

function buildReferenceEscapeToken(index) {
  const parsed = Number(index);
  const normalized = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  return `_@${normalized}$_`;
}

function collectReferenceOutputIndexesFromText(value) {
  const text = String(value ?? "");
  if (!text) return [];

  const indexes = new Set();
  REFERENCE_ESCAPE_REGEX.lastIndex = 0;
  let match = REFERENCE_ESCAPE_REGEX.exec(text);
  while (match) {
    const parsed = Number(match[1]);
    if (Number.isInteger(parsed) && parsed > 0) {
      indexes.add(parsed);
    }
    match = REFERENCE_ESCAPE_REGEX.exec(text);
  }
  REFERENCE_ESCAPE_REGEX.lastIndex = 0;

  return [...indexes].sort((a, b) => a - b);
}

function collectReferenceOutputIndexesFromItems(items = []) {
  const indexes = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    collectReferenceOutputIndexesFromText(item?.content).forEach((port) => indexes.add(port));
  });
  return [...indexes].sort((a, b) => a - b);
}

function getNextReferenceOutputIndex(items = []) {
  const indexes = collectReferenceOutputIndexesFromItems(items);
  if (!indexes.length) return 1;
  return indexes[indexes.length - 1] + 1;
}

function collectNodeReferenceOutputIndexes(node) {
  if (!node || typeof node !== "object") return [];
  const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
  const params = normalizeNodeParams(node.params, definition);
  return collectReferenceOutputIndexesFromItems(params.items);
}

function enforceSingleOutgoingEdges(edges = []) {
  const seenFromPort = new Set();
  const kept = [];

  for (let index = edges.length - 1; index >= 0; index -= 1) {
    const edge = edges[index];
    if (!edge?.from || !edge?.to) continue;
    const sourcePort = getEdgeSourcePort(edge);
    const key = `${edge.from}::${sourcePort}`;
    if (seenFromPort.has(key)) continue;
    seenFromPort.add(key);
    kept.push({ ...edge, sourcePort });
  }

  return kept.reverse();
}

function buildEdgeCurvePath(x1, y1, x2, y2) {
  const c = Math.max(60, Math.abs(x2 - x1) * 0.35);
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

function folderId() {
  return `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeRect(rect) {
  if (!rect) return null;
  return {
    left: Math.min(rect.x1, rect.x2),
    top: Math.min(rect.y1, rect.y2),
    right: Math.max(rect.x1, rect.x2),
    bottom: Math.max(rect.y1, rect.y2)
  };
}

function intersects(rect, box) {
  return !(
    box.x + box.width < rect.left ||
    box.x > rect.right ||
    box.y + box.height < rect.top ||
    box.y > rect.bottom
  );
}

function splitLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function indent(lines, level = 1) {
  const prefix = "  ".repeat(level);
  return lines.map((line) => `${prefix}${line}`);
}

function buildOutgoingMap(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    const list = map.get(edge.from) ?? [];
    list.push(edge);
    map.set(edge.from, list);
  });
  return map;
}

function normalizeInlineReferenceText(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function nodeReferenceInlineText(node, isZh) {
  if (!node || typeof node !== "object") {
    return isZh ? "引用节点" : "Referenced node";
  }

  const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
  const params = normalizeNodeParams(node.params, definition);
  const appliedItems = params.items.filter((item) => item.applied !== false);
  const usableItems = appliedItems.length ? appliedItems : params.items;

  const parts = usableItems
    .map((item) => {
      const type = normalizeItemType(item.type);
      if (type === "table") {
        return normalizeInlineReferenceText(normalizeTableItemPayload(item).content);
      }
      if (type === "ifelse") {
        return normalizeInlineReferenceText(normalizeIfElseItemPayload(item).content);
      }
      return normalizeInlineReferenceText(item.content);
    })
    .filter(Boolean);

  if (parts.length) return parts.join(isZh ? "； " : "; ");

  const summary = normalizeInlineReferenceText(params.summary);
  if (summary) return summary;
  return String(node.label ?? "").trim() || (isZh ? "引用节点" : "Referenced node");
}

function buildNodeReferenceTargetMap(nodeId, edges, idToNodeMap, isZh = false) {
  const map = new Map();
  edges.forEach((edge) => {
    if (edge.from !== nodeId) return;
    const sourcePort = getEdgeSourcePort(edge);
    if (sourcePort <= 0) return;
    const targetNode = idToNodeMap.get(edge.to);
    if (!targetNode) return;
    const targetDefinition = NODE_LIBRARY[targetNode.type] ?? NODE_LIBRARY.workflow;
    const targetParams = normalizeNodeParams(targetNode.params, targetDefinition);
    const replacement = targetParams.referenceOnly
      ? nodeReferenceInlineText(targetNode, isZh)
      : String(targetNode.label ?? "").trim();
    const fallback = String(targetNode.label ?? "").trim() || edge.to;
    map.set(sourcePort, replacement || fallback);
  });
  return map;
}

function resolveReferenceText(text, referenceTargetMap = new Map()) {
  const source = String(text ?? "");
  if (!source.includes("_@")) return source;
  return source.replace(REFERENCE_ESCAPE_REGEX, (full, rawIndex) => {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index <= 0) return full;
    const target = referenceTargetMap.get(index);
    return target ? target : full;
  });
}

function itemTypeLabel(type, isZh) {
  const map = isZh
    ? {
        list: "列表",
        ordered: "顺序列表",
        code: "代码块",
        table: "表格",
        ifelse: "IF-ELSE"
      }
    : {
        list: "List",
        ordered: "Ordered List",
        code: "Code",
        table: "Table",
        ifelse: "IF-ELSE"
      };
  return map[normalizeItemType(type)] ?? map.list;
}

function buildSkillItemLines(item, itemIndex, isZh, referenceTargetMap = new Map()) {
  const title = item.title || (isZh ? `行为 ${itemIndex + 1}` : `Behavior ${itemIndex + 1}`);
  const rawContent = resolveReferenceText(item.content, referenceTargetMap);
  const contentLines = splitLines(rawContent);
  const type = normalizeItemType(item.type);

  if (type === "code") {
    const codeLines = rawContent.length ? rawContent.replace(/\r\n/g, "\n").split("\n") : [""];
    const language = normalizeLang(item.language ?? item.lang ?? "text");
    return [
      `- ${title}:`,
      ...indent([`\`\`\`${language}`, ...codeLines, "\`\`\`"])
    ];
  }

  if (type === "table") {
    const tableLines = resolveReferenceText(normalizeTableItemPayload(item).content, referenceTargetMap).split("\n");
    return [`- ${title}:`, ...indent(tableLines)];
  }

  if (type === "ordered") {
    if (!contentLines.length) return [`- ${title}`];
    return [
      `- ${title}:`,
      ...indent(contentLines.map((line, index) => `${index + 1}. ${line}`))
    ];
  }

  if (type === "ifelse") {
    const payload = normalizeIfElseItemPayload(item);
    const condition = resolveReferenceText(payload.ifCondition, referenceTargetMap);
    const thenLines = splitLines(resolveReferenceText(payload.ifThen, referenceTargetMap));
    const elseLines = splitLines(resolveReferenceText(payload.ifElse, referenceTargetMap));
    return [
      `- ${title}:`,
      ...indent([
        `IF: ${condition}`,
        "THEN:",
        ...thenLines.map((line) => `- ${line}`),
        "ELSE:",
        ...elseLines.map((line) => `- ${line}`)
      ])
    ];
  }

  if (!contentLines.length) return [`- ${title}`];
  return [`- ${title}:`, ...indent(contentLines.map((line) => `- ${line}`))];
}

function renderNodeSummary(node, isZh) {
  const items = normalizeNodeItems(node?.params?.items);
  if (!items.length) return [`- ${node.label}`];

  return items.flatMap((item, index) => {
    const title = item.title || (isZh ? `条目 ${index + 1}` : `Item ${index + 1}`);
    const state = [
      item.applied !== false ? (isZh ? "应用中" : "applied") : (isZh ? "未应用" : "inactive"),
      itemTypeLabel(item.type, isZh)
    ].join(" / ");
    const contentLines = splitLines(item.content);
    return [
      `- ${title} [${state}]`,
      ...indent(contentLines.length ? contentLines.map((line) => `- ${line}`) : [`- ${isZh ? "空内容" : "Empty content"}`])
    ];
  });
}

function buildIncomingMap(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    const list = map.get(edge.to) ?? [];
    list.push(edge);
    map.set(edge.to, list);
  });
  return map;
}

function edgeKindText(kind, isZh) {
  const label = kind || "default";
  const map = isZh
    ? {
        default: "下一步",
        next: "下一步",
        true: "条件为真",
        false: "条件为假",
        loop: "循环体",
        exit: "退出循环"
      }
    : {
        default: "next",
        next: "next",
        true: "if true",
        false: "if false",
        loop: "loop body",
        exit: "loop exit"
      };
  return map[label] ?? label;
}

function edgeNoteText(edge, isZh) {
  const explicit = edge?.note || edge?.comment || edge?.label;
  if (explicit) return String(explicit);

  const kind = edge?.kind || "default";
  const map = isZh
    ? {
        default: "默认关联到下一个节点。",
        next: "建议继续查看下一个节点。",
        true: "条件成立时关联到该节点。",
        false: "条件不成立时关联到该节点。",
        loop: "表示循环体关联。",
        exit: "表示循环后续关联。"
      }
    : {
        default: "Default relation to the next node.",
        next: "Suggested relation to the next node.",
        true: "Related when condition is true.",
        false: "Related when condition is false.",
        loop: "Represents loop-body relation.",
        exit: "Represents post-loop relation."
      };

  return map[kind] ?? (isZh ? "按边类型表达节点关联。" : "Relation expressed by edge kind.");
}

function buildNodeEdgeBehaviorLines(node, sortedNodes, outgoingMap, reachableSet, idToNodeMap, isZh) {
  const outgoing = (outgoingMap.get(node.id) ?? []).filter((edge) => reachableSet.has(edge.to));
  if (!outgoing.length) return [];

  const orderIndexMap = new Map(sortedNodes.map((item, index) => [item.id, index]));
  const currentIndex = orderIndexMap.get(node.id);
  const naturalNextId =
    currentIndex === undefined || currentIndex >= sortedNodes.length - 1
      ? null
      : sortedNodes[currentIndex + 1]?.id;

  const meaningfulEdges = outgoing.filter((edge) => {
    const kind = edge.kind || "default";
    const isDefaultLike = kind === "default" || kind === "next";
    const isNaturalNext = isDefaultLike && naturalNextId && edge.to === naturalNextId;
    return !isNaturalNext;
  });

  if (!meaningfulEdges.length) return [];

  const edgeLines = meaningfulEdges.map((edge) => {
    const targetNode = idToNodeMap.get(edge.to);
    const target = targetNode?.label ?? edge.to;
    const kindText = edgeKindText(edge.kind, isZh);
    const note = edgeNoteText(edge, isZh);
    return isZh
      ? `- -> ${target} [${kindText}]（注释：${note}）`
      : `- -> ${target} [${kindText}] (note: ${note})`;
  });

  return [
    `- ${isZh ? "关联节点" : "Related nodes"}:`,
    ...indent(edgeLines)
  ];
}

function nodeNaturalSentence(node, isZh) {
  const params = normalizeNodeParams(node?.params, NODE_LIBRARY[node?.type] ?? NODE_LIBRARY.workflow);
  const summary = String(params.summary || "").trim();
  const fallback = isZh ? "未定义节点说明。" : "No details configured.";
  if (summary) return summary;

  const firstApplied = params.items.find((item) => item.applied !== false && String(item.content || "").trim());
  if (firstApplied) {
    return splitLines(firstApplied.content)[0] ?? fallback;
  }

  if (params.items.length) {
    return isZh
      ? `包含 ${params.items.length} 个通用条目。`
      : `Contains ${params.items.length} generic items.`;
  }

  return fallback;
}

function findNodeItemByKeywords(node, keywords) {
  const items = normalizeNodeItems(node?.params?.items);
  if (!items.length) return "";

  const match = items.find((item) => {
    const title = String(item.title || "").toLowerCase();
    return keywords.some((keyword) => title.includes(keyword));
  });
  return String(match?.content || "").trim();
}

function topoSortReachableNodes(graph, reachableSet, outgoingMap, incomingMap) {
  const reachableNodes = graph.nodes.filter((node) => reachableSet.has(node.id));
  const inDegree = new Map();
  reachableNodes.forEach((node) => inDegree.set(node.id, 0));

  graph.edges.forEach((edge) => {
    if (reachableSet.has(edge.from) && reachableSet.has(edge.to)) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
  });

  const queue = reachableNodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const ordered = [];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) continue;
    visited.add(current.id);
    ordered.push(current);

    (outgoingMap.get(current.id) ?? []).forEach((edge) => {
      if (!reachableSet.has(edge.to)) return;
      const nextDegree = (inDegree.get(edge.to) ?? 0) - 1;
      inDegree.set(edge.to, nextDegree);
      if (nextDegree === 0) {
        const target = graph.nodes.find((node) => node.id === edge.to);
        if (target && !visited.has(target.id)) queue.push(target);
      }
    });

    queue.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  if (ordered.length !== reachableNodes.length) {
    const rest = reachableNodes
      .filter((node) => !visited.has(node.id))
      .sort((a, b) => (incomingMap.get(a.id)?.length ?? 0) - (incomingMap.get(b.id)?.length ?? 0) || a.y - b.y || a.x - b.x);
    ordered.push(...rest);
  }

  return ordered;
}

function generateSkillMarkdown(graph, isZh) {
  const metadata = normalizeSkillMetadata(graph.metadata);
  const nodes = graph.nodes.filter((node) => node.type !== "metadata");

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to));
  const outgoingMap = buildOutgoingMap(edges);
  const incomingMap = buildIncomingMap(edges);
  const reachable = new Set(nodes.map((node) => node.id));
  const sorted = topoSortReachableNodes({ ...graph, nodes, edges }, reachable, outgoingMap, incomingMap);
  const idToNodeMap = new Map(nodes.map((node) => [node.id, node]));

  const nodeLines = sorted.flatMap((node) => {
    const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
    const params = normalizeNodeParams(node.params, definition);
    if (params.referenceOnly) return [];
    const appliedItems = params.items.filter((item) => item.applied !== false);
    const usableItems = appliedItems.length ? appliedItems : params.items;
    const referenceTargetMap = buildNodeReferenceTargetMap(node.id, edges, idToNodeMap, isZh);

    const itemLines = usableItems.flatMap((item, itemIndex) =>
      buildSkillItemLines(item, itemIndex, isZh, referenceTargetMap)
    );

    const summary = String(params.summary || "").trim();

    return [
      `## ${node.label}`,
      ...(summary ? [`- ${summary}`] : []),
      ...(itemLines.length ? itemLines : [`- ${isZh ? "无显式行为条目" : "No explicit behavior item."}`]),
      ""
    ];
  });

  const lines = [
    "---",
    `name: ${metadata.skillName}`,
    `description: ${metadata.description}`,
    "---",
    "",
    `# ${metadata.skillName}`,
    "",
    ...(nodeLines.length
      ? nodeLines
      : [isZh ? "> 当前没有行为节点。" : "> No behavior nodes available.", ""])
  ];

  return lines.join("\n");
}

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function normalizeWorkspaceViewMode(value) {
  return ["left", "split", "right"].includes(String(value)) ? String(value) : "split";
}

function normalizeWorkspaceMarkdownViewMode(value) {
  return ["raw", "rendered"].includes(String(value)) ? String(value) : "raw";
}

function normalizeWorkspaceVimSubMode(value) {
  return ["normal", "insert"].includes(String(value)) ? String(value) : "normal";
}

function normalizeWorkspaceActiveDoc(value) {
  return ["skill", "skillfo"].includes(String(value)) ? String(value) : "skill";
}

function normalizeFolderTone(value) {
  return ["cyan", "amber", "green", "pink"].includes(String(value)) ? String(value) : "cyan";
}

function normalizeSkillfoGraph(rawGraph = {}) {
  const source =
    rawGraph && typeof rawGraph === "object" && !Array.isArray(rawGraph)
      ? rawGraph
      : {};
  const sourceNodes = Array.isArray(source.nodes) ? source.nodes : [];
  const usedNodeIds = new Set();

  const nodes = sourceNodes
    .map((rawNode, index) => {
      if (!rawNode || typeof rawNode !== "object") return null;

      const type = normalizeNodeType(rawNode.type, "workflow");
      ensureNodeTypeDefinition(NODE_LIBRARY, type);
      const definition = NODE_LIBRARY[type] ?? NODE_LIBRARY.workflow;

      let id = String(rawNode.id ?? "").trim();
      if (!id || usedNodeIds.has(id)) {
        id = nodeId(type, index + 1);
        while (usedNodeIds.has(id)) {
          id = nodeId(type, index + 1);
        }
      }
      usedNodeIds.add(id);

      const params = normalizeNodeParams(rawNode.params, definition);
      const fallbackLabel = String(pick(definition.label, false) ?? type);
      return {
        id,
        type,
        label: String(rawNode.label ?? fallbackLabel).trim() || fallbackLabel,
        x: num(rawNode.x, num(rawNode?.position?.x, 90 + index * 220)),
        y: num(rawNode.y, num(rawNode?.position?.y, 96)),
        params
      };
    })
    .filter(Boolean);

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = enforceSingleOutgoingEdges(
    (Array.isArray(source.edges) ? source.edges : [])
      .map((rawEdge) => {
        if (!rawEdge || typeof rawEdge !== "object") return null;
        const from = String(rawEdge.from ?? "").trim();
        const to = String(rawEdge.to ?? "").trim();
        if (!nodeIdSet.has(from) || !nodeIdSet.has(to)) return null;
        return {
          ...rawEdge,
          id: String(rawEdge.id ?? edgeId()),
          from,
          to,
          kind: String(rawEdge.kind ?? "default").trim() || "default",
          sourcePort: getEdgeSourcePort(rawEdge)
        };
      })
      .filter(Boolean)
  );

  const usedFolderIds = new Set();
  const folders = (Array.isArray(source.folders) ? source.folders : [])
    .map((rawFolder, index) => {
      if (!rawFolder || typeof rawFolder !== "object") return null;
      let id = String(rawFolder.id ?? "").trim();
      if (!id || usedFolderIds.has(id)) {
        id = folderId();
        while (usedFolderIds.has(id)) {
          id = folderId();
        }
      }
      usedFolderIds.add(id);

      const rawMembers = Array.isArray(rawFolder.nodeIds)
        ? rawFolder.nodeIds
        : Array.isArray(rawFolder.nodes)
          ? rawFolder.nodes
          : [];
      const memberIds = Array.from(
        new Set(
          rawMembers
            .map((value) => (typeof value === "object" ? value?.id : value))
            .map((value) => String(value ?? "").trim())
            .filter((value) => nodeIdSet.has(value))
        )
      );

      if (!memberIds.length) return null;

      return {
        id,
        label: String(rawFolder.label ?? `Folder ${index + 1}`).trim() || `Folder ${index + 1}`,
        tone: normalizeFolderTone(rawFolder.tone),
        x: num(rawFolder.x, 0),
        y: num(rawFolder.y, 0),
        width: Math.max(120, num(rawFolder.width, 240)),
        height: Math.max(90, num(rawFolder.height, 180)),
        nodeIds: memberIds
      };
    })
    .filter(Boolean);

  const folderMembership = new Map();
  folders.forEach((folder) => {
    folder.nodeIds.forEach((id) => folderMembership.set(id, folder.id));
  });

  const syncedNodes = nodes.map((node) => {
    const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
    const params = cloneNodeParams(node.params, definition);
    const targetFolderId = folderMembership.get(node.id);
    if (targetFolderId) {
      params.folderId = targetFolderId;
    } else {
      delete params.folderId;
    }
    return { ...node, params };
  });

  const folderIdSet = new Set(folders.map((folder) => folder.id));
  const selectedNodeIdRaw = String(source.selectedNodeId ?? "").trim();
  const selectedFolderIdRaw = String(source.selectedFolderId ?? "").trim();

  return cloneGraph({
    metadata: normalizeSkillMetadata(source.metadata),
    nodes: syncedNodes,
    edges,
    folders,
    selectedNodeId: nodeIdSet.has(selectedNodeIdRaw)
      ? selectedNodeIdRaw
      : (syncedNodes[0]?.id ?? null),
    selectedFolderId: folderIdSet.has(selectedFolderIdRaw) ? selectedFolderIdRaw : null
  });
}

function normalizeSkillfoWorkspaceState(rawWorkspaceState = {}, graph = INITIAL_GRAPH) {
  const source =
    rawWorkspaceState && typeof rawWorkspaceState === "object" && !Array.isArray(rawWorkspaceState)
      ? rawWorkspaceState
      : {};
  const nodeIdSet = new Set((graph?.nodes ?? []).map((node) => node.id));
  const folderIdSet = new Set((graph?.folders ?? []).map((folder) => folder.id));

  const selectedNodeIdsRaw = Array.isArray(source.selectedNodeIds) ? source.selectedNodeIds : [];
  const selectedNodeIds = Array.from(
    new Set(
      selectedNodeIdsRaw
        .map((value) => String(value ?? "").trim())
        .filter((value) => nodeIdSet.has(value))
    )
  );

  const selectedNodeIdRaw = String(source.selectedNodeId ?? graph?.selectedNodeId ?? "").trim();
  const selectedNodeId = nodeIdSet.has(selectedNodeIdRaw)
    ? selectedNodeIdRaw
    : (graph?.selectedNodeId ?? null);

  if (selectedNodeId && !selectedNodeIds.includes(selectedNodeId)) {
    selectedNodeIds.push(selectedNodeId);
  }

  const selectedFolderIdRaw = String(source.selectedFolderId ?? graph?.selectedFolderId ?? "").trim();
  const selectedFolderId = folderIdSet.has(selectedFolderIdRaw)
    ? selectedFolderIdRaw
    : (graph?.selectedFolderId ?? null);

  return {
    viewMode: normalizeWorkspaceViewMode(source.viewMode),
    isDocMappingLive: parseBooleanFlag(source.isDocMappingLive, true),
    markdownViewMode: normalizeWorkspaceMarkdownViewMode(source.markdownViewMode),
    isModuleColorMappingOn: parseBooleanFlag(source.isModuleColorMappingOn, true),
    vimSubMode: normalizeWorkspaceVimSubMode(source.vimSubMode),
    activeDoc: normalizeWorkspaceActiveDoc(source.activeDoc),
    selectedNodeIds,
    selectedNodeId,
    selectedFolderId
  };
}

function normalizeSkillfoDocuments(rawDocuments = {}, graph = INITIAL_GRAPH) {
  const source =
    rawDocuments && typeof rawDocuments === "object" && !Array.isArray(rawDocuments)
      ? rawDocuments
      : {};
  const hasSkillMarkdown = Object.prototype.hasOwnProperty.call(source, "skillMarkdown");
  return {
    skillMarkdown: hasSkillMarkdown && source.skillMarkdown !== undefined && source.skillMarkdown !== null
      ? String(source.skillMarkdown)
      : generateSkillMarkdown(graph, false)
  };
}

function buildSkillfoTopologySnapshot(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = (Array.isArray(graph?.edges) ? graph.edges : [])
    .filter((edge) => nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to))
    .map((edge) => ({
      edgeId: String(edge.id ?? ""),
      from: edge.from,
      to: edge.to,
      kind: String(edge.kind ?? "default"),
      sourcePort: getEdgeSourcePort(edge)
    }));

  const outgoingByNode = {};
  const incomingByNode = {};
  nodes.forEach((node) => {
    outgoingByNode[node.id] = [];
    incomingByNode[node.id] = [];
  });

  edges.forEach((edge) => {
    outgoingByNode[edge.from]?.push({
      edgeId: edge.edgeId,
      to: edge.to,
      kind: edge.kind,
      sourcePort: edge.sourcePort
    });
    incomingByNode[edge.to]?.push({
      edgeId: edge.edgeId,
      from: edge.from,
      kind: edge.kind,
      sourcePort: edge.sourcePort
    });
  });

  const outgoingMap = buildOutgoingMap(edges);
  const incomingMap = buildIncomingMap(edges);
  const reachableSet = new Set(nodes.map((node) => node.id));
  const topologicalOrder = topoSortReachableNodes(
    { ...graph, nodes, edges },
    reachableSet,
    outgoingMap,
    incomingMap
  ).map((node) => node.id);

  return {
    topologicalOrder,
    outgoingByNode,
    incomingByNode
  };
}

function buildSkillfoPayload(graph, workspaceState = {}) {
  const normalizedGraph = normalizeSkillfoGraph(graph);
  const normalizedWorkspaceState = normalizeSkillfoWorkspaceState(workspaceState, normalizedGraph);
  const normalizedDocuments = normalizeSkillfoDocuments(
    workspaceState?.documents ?? { skillMarkdown: workspaceState?.skillMarkdown },
    normalizedGraph
  );

  return {
    format: SKILLFO_FORMAT,
    formatVersion: SKILLFO_FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    metadata: normalizeSkillMetadata(normalizedGraph.metadata),
    workspaceState: normalizedWorkspaceState,
    documents: normalizedDocuments,
    graph: normalizedGraph,
    topology: buildSkillfoTopologySnapshot(normalizedGraph)
  };
}

function extractSkillfoPayloadJson(markdown) {
  const content = String(markdown ?? "");
  if (!content.trim()) return "";

  const start = content.indexOf(SKILLFO_PAYLOAD_START);
  if (start >= 0) {
    const afterStart = content.slice(start + SKILLFO_PAYLOAD_START.length);
    const end = afterStart.indexOf(SKILLFO_PAYLOAD_END);
    const scoped = end >= 0 ? afterStart.slice(0, end) : afterStart;
    const fenced = scoped.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    return scoped.trim();
  }

  const fencedBlocks = [...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const block of fencedBlocks) {
    const candidate = String(block[1] ?? "").trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && (parsed.graph || parsed.nodes || parsed.format)) {
        return candidate;
      }
    } catch {
      // Try next fenced block.
    }
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  return "";
}

function parseSkillfoMarkdown(markdown) {
  const payloadText = extractSkillfoPayloadJson(markdown);
  if (!payloadText) {
    throw new Error("Cannot find SKILLFO workspace payload.");
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    throw new Error(`Invalid SKILLFO payload JSON: ${error.message}`);
  }

  const payloadObject =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const rawGraph =
    payloadObject.graph && typeof payloadObject.graph === "object"
      ? payloadObject.graph
      : {
          metadata: payloadObject.metadata,
          nodes: payloadObject.nodes,
          edges: payloadObject.edges,
          folders: payloadObject.folders,
          selectedNodeId: payloadObject.selectedNodeId,
          selectedFolderId: payloadObject.selectedFolderId
        };

  const graph = normalizeSkillfoGraph(rawGraph);
  const workspaceState = normalizeSkillfoWorkspaceState(payloadObject.workspaceState, graph);
  const documents = normalizeSkillfoDocuments(
    payloadObject.documents ?? { skillMarkdown: payloadObject.skillMarkdown },
    graph
  );

  return {
    format: String(payloadObject.format ?? ""),
    formatVersion: String(payloadObject.formatVersion ?? ""),
    graph,
    workspaceState,
    documents
  };
}

function buildSkillfoTopologyLines(graph) {
  const nodeMap = new Map((graph.nodes ?? []).map((node) => [node.id, node]));
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  if (!edges.length) return ["- no_edges"];

  return edges.map((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    const fromLabel = `${fromNode?.label ?? edge.from} (${edge.from})`;
    const toLabel = `${toNode?.label ?? edge.to} (${edge.to})`;
    return `- ${fromLabel} -> ${toLabel} [kind=${edge.kind || "default"}, sourcePort=${getEdgeSourcePort(edge)}, edgeId=${edge.id}]`;
  });
}

function generateSkillfoMarkdown(graph, workspaceState, isZh) {
  const payload = buildSkillfoPayload(graph, workspaceState);
  const payloadJson = JSON.stringify(payload, null, 2);
  const topologyLines = buildSkillfoTopologyLines(payload.graph);
  const selectedNodeCount = payload.workspaceState.selectedNodeIds?.length ?? 0;

  const lines = [
    "# SKILLFO.md",
    "",
    "Machine-readable workspace snapshot.",
    "All field names are declared in English to avoid parser ambiguity and encoding issues.",
    "",
    "## SnapshotSummary",
    `- format: ${payload.format}`,
    `- formatVersion: ${payload.formatVersion}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- nodeCount: ${payload.graph.nodes.length}`,
    `- edgeCount: ${payload.graph.edges.length}`,
    `- folderCount: ${(payload.graph.folders ?? []).length}`,
    `- selectedNodeCount: ${selectedNodeCount}`,
    "",
    "## GraphTopology",
    ...topologyLines,
    "",
    "## WorkspacePayload",
    SKILLFO_PAYLOAD_START,
    "```json",
    payloadJson,
    "```",
    SKILLFO_PAYLOAD_END,
    ""
  ];

  return lines.join("\n");
}

function isEditableElement(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function snapToGrid(value) {
  return Math.round(value / DRAG_GRID) * DRAG_GRID;
}


export {
  NODE_W,
  NODE_H,
  DEFAULT_NODE_COLOR,
  TABLE_SIZE_MIN,
  TABLE_SIZE_MAX,
  CODE_LANGUAGE_OPTIONS,
  NODE_LIBRARY,
  PRESETS,
  EDGE_LABEL,
  INITIAL_GRAPH,
  DRAG_GRID,
  normalizeSkillMetadata,
  sanitizeNodeColor,
  normalizeItemType,
  clampItemTableSize,
  normalizeTableDataShape,
  normalizeTableItemPayload,
  normalizeIfElseItemPayload,
  createNodeItem,
  normalizeNodeParams,
  cloneNodeParams,
  cloneGraph,
  pick,
  num,
  nodeId,
  edgeId,
  getEdgeSourcePort,
  buildReferenceEscapeToken,
  collectReferenceOutputIndexesFromItems,
  collectNodeReferenceOutputIndexes,
  getNextReferenceOutputIndex,
  enforceSingleOutgoingEdges,
  buildEdgeCurvePath,
  folderId,
  normalizeRect,
  intersects,
  indent,
  generateSkillMarkdown,
  generateSkillfoMarkdown,
  parseSkillfoMarkdown,
  isEditableElement,
  snapToGrid,
};
