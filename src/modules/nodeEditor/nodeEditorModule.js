import { normalizeLang } from "../../utils/markdownRenderUtils";

const NODE_W = 196;
const NODE_H = 72;
const DEFAULT_NODE_COLOR = "#61afef";
const RESERVED_PARAM_KEYS = new Set(["color", "summary", "items", "folderId"]);
const NODE_ITEM_TYPES = ["list", "code", "table"];
const TABLE_SIZE_MIN = 1;
const TABLE_SIZE_MAX = 12;
const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLS = 2;
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

function buildGenericNodeDefaults(color, summary, items) {
  return {
    color,
    summary,
    items: normalizeNodeItems(items)
  };
}

const NODE_LIBRARY = {
  metadata: {
    chip: "META",
    title: { zh: "元数据", en: "Metadata" },
    label: { zh: "元数据", en: "Metadata" },
    color: "#5bb8ff",
    defaults: () =>
      buildGenericNodeDefaults(
        "#5bb8ff",
        "Describe what this skill is for.",
        [
          { title: "Skill Name", content: "My Skill" },
          { title: "Description", content: "Describe what this skill is for." },
          { title: "When To Use", content: "Use when you need to produce a reusable SKILL.md." },
          { title: "Bait", content: "A short one-line lure for discovery." }
        ]
      )
  },
  prereq: {
    chip: "CHECK",
    title: { zh: "前置检查", en: "Prerequisite" },
    label: { zh: "前置检查", en: "Prerequisite" },
    color: "#ffb66f",
    defaults: () =>
      buildGenericNodeDefaults(
        "#ffb66f",
        "Run prerequisite checks before continuing.",
        [
          { title: "Checks", content: "node --version\npython --version" },
          { title: "On Fail", content: "Stop and report missing prerequisites." }
        ]
      )
  },
  env: {
    chip: "ENV",
    title: { zh: "环境配置", en: "Environment" },
    label: { zh: "环境配置", en: "Environment" },
    color: "#7fe18f",
    defaults: () =>
      buildGenericNodeDefaults(
        "#7fe18f",
        "Prepare runtime paths and environment variables.",
        [
          { title: "Paths", content: "workspace: ./\noutput: ./dist" },
          { title: "Variables", content: "OPENAI_API_KEY=\nCODEX_HOME=" }
        ]
      )
  },
  workflow: {
    chip: "FLOW",
    title: { zh: "核心工作流", en: "Workflow" },
    label: { zh: "核心工作流", en: "Workflow" },
    color: "#8ea4ff",
    defaults: () =>
      buildGenericNodeDefaults(
        "#8ea4ff",
        "Define the core workflow and key execution pattern.",
        [
          { title: "Goal", content: "Define the core skill intent." },
          { title: "Pattern", content: "1. Gather context\n2. Structure documentation\n3. Review constraints" }
        ]
      )
  },
  guardrail: {
    chip: "SAFE",
    title: { zh: "护栏", en: "Guardrail" },
    label: { zh: "护栏", en: "Guardrail" },
    color: "#ff8f95",
    defaults: () =>
      buildGenericNodeDefaults(
        "#ff8f95",
        "Define safety rules and defensive constraints.",
        [{ title: "Rules", content: "- Validate inputs\n- Never delete data by default\n- Report failures clearly" }]
      )
  },
  cli: {
    chip: "CLI",
    title: { zh: "CLI 工具", en: "CLI Tool" },
    label: { zh: "CLI 工具", en: "CLI Tool" },
    color: "#79b9ff",
    defaults: () =>
      buildGenericNodeDefaults(
        "#79b9ff",
        "Run CLI command templates.",
        [
          { title: "Command", content: "npm run build" },
          { title: "Workdir", content: "." }
        ]
      )
  },
  python: {
    chip: "PY",
    title: { zh: "Python 脚本", en: "Python Script" },
    label: { zh: "Python 脚本", en: "Python Script" },
    color: "#7ec8ff",
    defaults: () =>
      buildGenericNodeDefaults(
        "#7ec8ff",
        "Python script module.",
        [{ title: "Script", content: "print('hello from python')" }]
      )
  },
  js: {
    chip: "JS",
    title: { zh: "JavaScript 脚本", en: "JavaScript Script" },
    label: { zh: "JavaScript 脚本", en: "JavaScript Script" },
    color: "#f6de72",
    defaults: () =>
      buildGenericNodeDefaults(
        "#f6de72",
        "JavaScript script module.",
        [{ title: "Script", content: "console.log('hello from js')" }]
      )
  },
  condition: {
    chip: "IF",
    title: { zh: "条件", en: "Condition" },
    label: { zh: "条件", en: "Condition" },
    color: "#d8b76c",
    defaults: () =>
      buildGenericNodeDefaults(
        "#d8b76c",
        "Conditional branch definition.",
        [
          { title: "LHS", content: "score" },
          { title: "Operator", content: ">" },
          { title: "RHS", content: "6" }
        ]
      )
  },
  loop: {
    chip: "LOOP",
    title: { zh: "循环", en: "Loop" },
    label: { zh: "循环", en: "Loop" },
    color: "#f292d2",
    defaults: () =>
      buildGenericNodeDefaults(
        "#f292d2",
        "Loop module and retry controls.",
        [
          { title: "Iterations", content: "3" },
          { title: "Iterator", content: "item" }
        ]
      )
  }
};

const PRESETS = [
  {
    id: "skillSkeleton",
    title: { zh: "基础技能骨架", en: "Skill Skeleton" },
    desc: { zh: "Prereq + Env + Workflow + Guardrails", en: "Prereq + Env + Workflow + Guardrails" },
    entry: "pre",
    nodes: [
      { key: "pre", type: "prereq", dx: 0, dy: 22, label: { zh: "前置检查", en: "Prerequisite" } },
      { key: "env", type: "env", dx: 250, dy: 22, label: { zh: "环境配置", en: "Environment" } },
      { key: "flow", type: "workflow", dx: 500, dy: 22, label: { zh: "核心流程", en: "Core Workflow" } },
      { key: "safe", type: "guardrail", dx: 750, dy: 22, label: { zh: "护栏", en: "Guardrails" } }
    ],
    edges: [
      { from: "pre", to: "env", kind: "default" },
      { from: "env", to: "flow", kind: "default" },
      { from: "flow", to: "safe", kind: "default" }
    ]
  },
  {
    id: "toolChain",
    title: { zh: "工具链编排", en: "Tool Chain" },
    desc: { zh: "CLI + Python + JS 工具节点串联", en: "CLI + Python + JS orchestration" },
    entry: "cli",
    nodes: [
      { key: "cli", type: "cli", dx: 0, dy: 22, label: { zh: "CLI 执行", en: "CLI Step" } },
      { key: "py", type: "python", dx: 250, dy: 22, label: { zh: "Python 处理", en: "Python Step" } },
      { key: "js", type: "js", dx: 500, dy: 22, label: { zh: "JS 处理", en: "JS Step" } }
    ],
    edges: [
      { from: "cli", to: "py", kind: "default" },
      { from: "py", to: "js", kind: "default" }
    ]
  },
  {
    id: "resilientFlow",
    title: { zh: "条件与循环流程", en: "Condition + Loop" },
    desc: { zh: "通过 IF + LOOP 构建弹性工作流", en: "Resilient flow with IF + LOOP" },
    entry: "if",
    nodes: [
      { key: "if", type: "condition", dx: 0, dy: 66, label: { zh: "条件判断", en: "Condition" } },
      { key: "loop", type: "loop", dx: 258, dy: 22, label: { zh: "重试循环", en: "Retry Loop" } },
      { key: "cli", type: "cli", dx: 516, dy: 22, label: { zh: "CLI 执行", en: "CLI" } },
      { key: "safe", type: "guardrail", dx: 516, dy: 166, label: { zh: "收敛规则", en: "Convergence Rules" } }
    ],
    edges: [
      { from: "if", to: "loop", kind: "true" },
      { from: "if", to: "safe", kind: "false" },
      { from: "loop", to: "cli", kind: "loop" },
      { from: "cli", to: "loop", kind: "default" },
      { from: "loop", to: "safe", kind: "exit" }
    ]
  }
];

const USER_NODE_LIBRARY_KEY = "skillfo-user-node-library-v1";

const DEFAULT_IMPORTED_NODE_PACKS = [
  {
    id: "imported-quality-gate",
    title: "Quality Gate Pack",
    description: "Custom checks, lint gate, and report nodes imported by user.",
    nodeCount: 4,
    tags: ["quality", "lint", "report"],
    updatedAt: "2026-04-12T09:20:00Z"
  },
  {
    id: "imported-ops-alert",
    title: "Ops Alert Pack",
    description: "Alert routing and escalation nodes imported from local archive.",
    nodeCount: 3,
    tags: ["ops", "alert", "escalation"],
    updatedAt: "2026-04-09T03:00:00Z"
  }
];

function readUserImportedNodePacks() {
  if (typeof window === "undefined") return DEFAULT_IMPORTED_NODE_PACKS;

  try {
    const raw = window.localStorage.getItem(USER_NODE_LIBRARY_KEY);
    if (!raw) return DEFAULT_IMPORTED_NODE_PACKS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_IMPORTED_NODE_PACKS;

    return parsed.map((item, index) => ({
      id: String(item.id ?? `imported-${index + 1}`),
      title: String(item.title ?? "Imported Pack"),
      description: String(item.description ?? ""),
      nodeCount: Number(item.nodeCount ?? 0),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString()
    }));
  } catch {
    return DEFAULT_IMPORTED_NODE_PACKS;
  }
}

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
    items
  };

  if (source.folderId) normalized.folderId = source.folderId;
  return normalized;
}

function cloneNodeParams(params, definition) {
  const normalized = normalizeNodeParams(params, definition);
  return {
    ...normalized,
    items: normalized.items.map((item) => ({ ...item }))
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

function enforceSingleOutgoingEdges(edges = []) {
  const seenFrom = new Set();
  const kept = [];

  for (let index = edges.length - 1; index >= 0; index -= 1) {
    const edge = edges[index];
    if (!edge?.from || !edge?.to) continue;
    if (seenFrom.has(edge.from)) continue;
    seenFrom.add(edge.from);
    kept.push(edge);
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

function itemTypeLabel(type, isZh) {
  const map = isZh
    ? {
        list: "列表",
        code: "代码块",
        table: "表格"
      }
    : {
        list: "List",
        code: "Code",
        table: "Table"
      };
  return map[normalizeItemType(type)] ?? map.list;
}

function buildSkillItemLines(item, itemIndex, isZh) {
  const title = item.title || (isZh ? `行为 ${itemIndex + 1}` : `Behavior ${itemIndex + 1}`);
  const rawContent = String(item.content ?? "");
  const contentLines = splitLines(item.content);
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
    const tableLines = normalizeTableItemPayload(item).content.split("\n");
    return [`- ${title}:`, ...indent(tableLines)];
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
    const appliedItems = params.items.filter((item) => item.applied !== false);
    const usableItems = appliedItems.length ? appliedItems : params.items;

    const itemLines = usableItems.flatMap((item, itemIndex) =>
      buildSkillItemLines(item, itemIndex, isZh)
    );

    const summary = String(params.summary || "").trim();
    const edgeBehaviorLines = buildNodeEdgeBehaviorLines(
      node,
      sorted,
      outgoingMap,
      reachable,
      idToNodeMap,
      isZh
    );

    return [
      `## ${node.label}`,
      ...(summary ? [`- ${summary}`] : []),
      ...(itemLines.length ? itemLines : [`- ${isZh ? "无显式行为条目" : "No explicit behavior item."}`]),
      ...edgeBehaviorLines,
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

function generateSkillfoMarkdown(graph, workspaceState, isZh) {
  const state = workspaceState ?? {};
  const metadata = normalizeSkillMetadata(graph.metadata);
  const nodes = graph.nodes.filter((node) => node.type !== "metadata");
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to));
  const outgoingMap = buildOutgoingMap(edges);
  const incomingMap = buildIncomingMap(edges);
  const reachable = new Set(nodes.map((node) => node.id));
  const sorted = topoSortReachableNodes({ ...graph, nodes, edges }, reachable, outgoingMap, incomingMap);

  const lines = [
    "# SKILLFO.md",
    "",
    `## ${isZh ? "Metadata Properties（元数据属性）" : "Metadata Properties"}`,
    `- ${isZh ? "技能名称" : "Skill Name"}: ${metadata.skillName}`,
    `- ${isZh ? "描述" : "Description"}: ${metadata.description}`,
    "",
    `## ${isZh ? "Workspace Properties（工作区属性）" : "Workspace Properties"}`,
    `- ${isZh ? "视图模式" : "View mode"}: ${state.viewMode ?? "split"}`,
    `- ${isZh ? "文档映射" : "Doc mapping"}: ${state.isDocMappingLive ? (isZh ? "开启" : "ON") : (isZh ? "关闭" : "OFF")}`,
    `- ${isZh ? "预览模式" : "Preview mode"}: ${state.markdownViewMode ?? "raw"}`,
    `- ${isZh ? "颜色映射" : "Color mapping"}: ${state.isModuleColorMappingOn ? (isZh ? "开启" : "ON") : (isZh ? "关闭" : "OFF")}`,
    `- ${isZh ? "编辑状态" : "Editor mode"}: Vim ${state.vimSubMode === "insert" ? "INSERT" : "NORMAL"}`,
    `- ${isZh ? "当前文档" : "Current document"}: ${state.activeDoc === "skillfo" ? "SKILLFO.md" : "SKILL.md"}`,
    `- ${isZh ? "节点数量" : "Node count"}: ${nodes.length}`,
    `- ${isZh ? "连线数量" : "Edge count"}: ${edges.length}`,
    `- ${isZh ? "文件夹数量" : "Folder count"}: ${(graph.folders ?? []).length}`,
    `- ${isZh ? "选中节点数" : "Selected nodes"}: ${state.selectedNodeCount ?? 0}`,
    "",
    `## ${isZh ? "Node Properties（节点属性）" : "Node Properties"}`,
    ...(sorted.length
      ? sorted.flatMap((node, index) => {
          const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
          const params = normalizeNodeParams(node.params, definition);
          const itemLines = params.items.length
            ? params.items.flatMap((item, itemIndex) => {
                const title = item.title || (isZh ? `条目 ${itemIndex + 1}` : `Item ${itemIndex + 1}`);
                const stateText = [
                  item.applied !== false ? (isZh ? "应用中" : "applied") : (isZh ? "未应用" : "inactive"),
                  itemTypeLabel(item.type, isZh)
                ].join(" / ");
                const content = splitLines(item.content);
                return [
                  `- ${title} [${stateText}]`,
                  ...indent(content.length ? content.map((line) => `- ${line}`) : [`- ${isZh ? "空内容" : "Empty content"}`], 1)
                ];
              })
            : [`- ${isZh ? "无条目" : "No items"}`];

          return [
            `### ${index + 1}. ${node.label}`,
            `- id: ${node.id}`,
            `- ${isZh ? "类型" : "Type"}: ${node.type}`,
            `- ${isZh ? "展示名称" : "Display"}: ${pick(definition.title, isZh)}`,
            `- ${isZh ? "坐标" : "Position"}: (${node.x}, ${node.y})`,
            `- ${isZh ? "颜色" : "Color"}: ${sanitizeNodeColor(params.color, definition.color ?? DEFAULT_NODE_COLOR)}`,
            `- ${isZh ? "概要" : "Summary"}: ${params.summary || (isZh ? "无" : "None")}`,
            `- ${isZh ? "条目" : "Items"}:`,
            ...indent(itemLines),
            ""
          ];
        })
      : [`- ${isZh ? "暂无节点" : "No nodes available."}`, ""]),
    `## ${isZh ? "Edge Topology（连线拓扑）" : "Edge Topology"}`,
    ...(edges.length
      ? edges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
          const to = nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
          return `- ${from} -> ${to} [${edge.kind || "default"}]`;
        })
      : [`- ${isZh ? "暂无连线" : "No edges."}`]),
    "",
    `## ${isZh ? "Folders（封装组）" : "Folders"}`,
    ...((graph.folders ?? []).length
      ? (graph.folders ?? []).flatMap((folder) => {
          const members = folder.nodeIds
            .map((id) => graph.nodes.find((node) => node.id === id)?.label)
            .filter(Boolean);
          return [
            `- ${folder.label} (${members.length})`,
            ...indent(members.map((label) => `- ${label}`))
          ];
        })
      : [`- ${isZh ? "无文件夹" : "No folders."}`]),
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
  readUserImportedNodePacks,
  normalizeSkillMetadata,
  sanitizeNodeColor,
  normalizeItemType,
  clampItemTableSize,
  normalizeTableDataShape,
  normalizeTableItemPayload,
  createNodeItem,
  normalizeNodeParams,
  cloneNodeParams,
  cloneGraph,
  pick,
  num,
  nodeId,
  edgeId,
  enforceSingleOutgoingEdges,
  buildEdgeCurvePath,
  folderId,
  normalizeRect,
  intersects,
  indent,
  generateSkillMarkdown,
  generateSkillfoMarkdown,
  isEditableElement,
  snapToGrid,
};
