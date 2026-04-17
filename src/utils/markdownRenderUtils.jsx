const DEFAULT_MODULE_ID = "general";
const DEFAULT_GENERAL_BACKGROUND = "rgba(215, 227, 244, 0.06)";
const DEFAULT_GENERAL_ACCENT = "#9fb3c8";
const DEFAULT_MODULE_BACKGROUND_ALPHA = 0.08;

const DEFAULT_HEADING_ALIASES = [
  { moduleId: "metadata", keywords: ["overview", "概览", "metadata", "元数据"] },
  { moduleId: "prereq", keywords: ["prerequisite", "前置"] },
  { moduleId: "env", keywords: ["environment", "环境"] },
  {
    moduleId: "workflow",
    keywords: [
      "workflow",
      "工作流",
      "node modules",
      "节点模块",
      "node composition",
      "节点编排",
      "node properties",
      "节点属性"
    ]
  },
  { moduleId: "topology", keywords: ["topology", "拓扑", "edge topology", "连线拓扑"] },
  { moduleId: "paths", keywords: ["execution paths", "执行路径"] },
  { moduleId: "guardrail", keywords: ["guardrails", "护栏"] },
  { moduleId: "folders", keywords: ["folders", "文件夹"] },
  { moduleId: "notes", keywords: ["execution notes", "执行说明", "composer notes", "编排说明"] }
];

const ADDITIONAL_HEADING_ALIASES = [
  {
    moduleId: "metadata",
    keywords: [
      "objective",
      "summary",
      "purpose",
      "scope",
      "background",
      "\u76ee\u6807",
      "\u6982\u8ff0",
      "\u80cc\u666f"
    ]
  },
  {
    moduleId: "prereq",
    keywords: [
      "trigger",
      "precondition",
      "when to use",
      "before you begin",
      "\u89e6\u53d1",
      "\u524d\u7f6e\u6761\u4ef6",
      "\u4f55\u65f6\u4f7f\u7528"
    ]
  },
  {
    moduleId: "env",
    keywords: [
      "setup",
      "external tool",
      "tooling",
      "workspace state",
      "\u73af\u5883\u51c6\u5907",
      "\u5916\u90e8\u5de5\u5177",
      "\u5de5\u4f5c\u533a\u72b6\u6001"
    ]
  },
  {
    moduleId: "workflow",
    keywords: [
      "procedure",
      "process",
      "node type set",
      "node and item mapping",
      "inference rules",
      "causal semantics analysis",
      "atomic item",
      "\u6d41\u7a0b",
      "\u8282\u70b9\u548c\u6761\u76ee\u6620\u5c04",
      "\u63a8\u65ad\u89c4\u5219"
    ]
  },
  {
    moduleId: "topology",
    keywords: [
      "graph topology",
      "branch graph",
      "graph construction",
      "branch graph construction",
      "topology requirements",
      "\u5206\u652f\u56fe",
      "\u62d3\u6251\u8981\u6c42"
    ]
  },
  {
    moduleId: "paths",
    keywords: [
      "reference and port",
      "reference and port rules",
      "routing",
      "branch path",
      "\u5f15\u7528\u548c\u7aef\u53e3\u89c4\u5219",
      "\u8def\u7531"
    ]
  },
  {
    moduleId: "guardrail",
    keywords: [
      "hard requirements",
      "blocking rules",
      "hard rules",
      "constraints",
      "validation",
      "\u786c\u6027\u8981\u6c42",
      "\u963b\u585e\u89c4\u5219",
      "\u7ea6\u675f",
      "\u6821\u9a8c"
    ]
  },
  {
    moduleId: "notes",
    keywords: [
      "example",
      "appendix",
      "minimal branch example",
      "\u793a\u4f8b",
      "\u9644\u5f55"
    ]
  }
];

const DEFAULT_MODULE_RULES = {
  [DEFAULT_MODULE_ID]: { mode: "none", typeKeys: [] },
  metadata: { mode: "types", typeKeys: ["metadata"] },
  prereq: { mode: "types", typeKeys: ["prereq"] },
  env: { mode: "types", typeKeys: ["env"] },
  workflow: { mode: "types", typeKeys: ["workflow"] },
  topology: { mode: "all", typeKeys: [] },
  paths: { mode: "all", typeKeys: [] },
  guardrail: { mode: "types", typeKeys: ["guardrail"] },
  folders: { mode: "foldered", typeKeys: [] },
  notes: { mode: "all", typeKeys: [] }
};

const PARAM_LABELS = [
  "name",
  "description",
  "when",
  "bait",
  "on fail",
  "paths",
  "variables",
  "workdir",
  "goal",
  "pattern",
  "rules",
  "描述",
  "适用场景",
  "诱饵",
  "失败处理",
  "路径",
  "变量",
  "工作目录"
];

const PARAM_LABEL_REGEX = new RegExp(
  `(${PARAM_LABELS
    .map((item) => escapeRegex(item))
    .sort((a, b) => b.length - a.length)
    .join("|")})(\\s*[：:])`,
  "giu"
);

export const MODULE_BACKGROUND_COLORS = {
  general: "rgba(215, 227, 244, 0.06)",
  metadata: "rgba(102, 217, 239, 0.08)",
  prereq: "rgba(255, 180, 84, 0.08)",
  env: "rgba(126, 231, 135, 0.08)",
  workflow: "rgba(122, 162, 247, 0.09)",
  topology: "rgba(167, 139, 250, 0.08)",
  paths: "rgba(245, 158, 11, 0.08)",
  guardrail: "rgba(251, 113, 133, 0.08)",
  folders: "rgba(74, 222, 128, 0.07)",
  notes: "rgba(97, 175, 239, 0.07)"
};

const MODULE_ACCENT_COLORS = {
  general: "#9fb3c8",
  metadata: "#66d9ef",
  prereq: "#ffb454",
  env: "#7ee787",
  workflow: "#7aa2f7",
  topology: "#a78bfa",
  paths: "#f59e0b",
  guardrail: "#fb7185",
  folders: "#4ade80",
  notes: "#61afef"
};

function normalizeTypeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeModuleId(value, fallback = DEFAULT_MODULE_ID) {
  const moduleId = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return moduleId || fallback;
}

function toHexColorOrFallback(value, fallback = DEFAULT_GENERAL_ACCENT) {
  const color = String(value ?? "").trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return fallback;
  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return color.toLowerCase();
}

function hexToRgba(hexColor, alpha = DEFAULT_MODULE_BACKGROUND_ALPHA) {
  const hex = toHexColorOrFallback(hexColor, DEFAULT_GENERAL_ACCENT).replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : DEFAULT_MODULE_BACKGROUND_ALPHA;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function collectLocalizedValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return [value.zh, value.en, value.cn]
    .filter(Boolean)
    .map((item) => String(item));
}

function pushKeyword(targetSet, keyword) {
  const text = String(keyword ?? "").trim().toLowerCase();
  if (!text) return;
  targetSet.add(text);
  if (/^[a-z0-9_-]+$/.test(text)) {
    targetSet.add(text.replace(/[-_]+/g, " "));
  }
}

function normalizeRule(rule) {
  const raw = rule && typeof rule === "object" && !Array.isArray(rule) ? rule : {};
  const mode = ["all", "foldered", "types", "none"].includes(raw.mode) ? raw.mode : "none";
  const typeKeys = Array.isArray(raw.typeKeys)
    ? raw.typeKeys.map((item) => normalizeTypeKey(item)).filter(Boolean)
    : [];
  return {
    mode,
    typeKeys: Array.from(new Set(typeKeys))
  };
}

function toRuleMap(rules = {}) {
  const map = {};
  Object.entries(rules).forEach(([moduleId, rule]) => {
    map[normalizeModuleId(moduleId)] = normalizeRule(rule);
  });
  return map;
}

export function buildMarkdownAssociationConfig(nodeLibrary = {}, options = {}) {
  const resolvedNodeLibrary = nodeLibrary && typeof nodeLibrary === "object" ? nodeLibrary : {};
  const moduleKeywords = new Map();
  const moduleRules = toRuleMap(DEFAULT_MODULE_RULES);
  const moduleBackgroundColors = {
    [DEFAULT_MODULE_ID]: String(options.generalBackgroundColor ?? MODULE_BACKGROUND_COLORS.general ?? DEFAULT_GENERAL_BACKGROUND)
  };
  const moduleAccentColors = {
    [DEFAULT_MODULE_ID]: toHexColorOrFallback(options.generalAccentColor, DEFAULT_GENERAL_ACCENT)
  };

  Object.entries(MODULE_BACKGROUND_COLORS).forEach(([moduleId, color]) => {
    const normalizedModuleId = normalizeModuleId(moduleId);
    if (!moduleBackgroundColors[normalizedModuleId]) {
      moduleBackgroundColors[normalizedModuleId] = color;
    }
  });

  Object.entries(MODULE_ACCENT_COLORS).forEach(([moduleId, color]) => {
    const normalizedModuleId = normalizeModuleId(moduleId);
    if (!moduleAccentColors[normalizedModuleId]) {
      moduleAccentColors[normalizedModuleId] = toHexColorOrFallback(color, DEFAULT_GENERAL_ACCENT);
    }
  });

  const ensureKeywordSet = (moduleId) => {
    const normalized = normalizeModuleId(moduleId);
    if (!moduleKeywords.has(normalized)) moduleKeywords.set(normalized, new Set());
    return moduleKeywords.get(normalized);
  };

  const registerAlias = (moduleId, keyword) => {
    if (!keyword) return;
    const list = Array.isArray(keyword) ? keyword : [keyword];
    const bucket = ensureKeywordSet(moduleId);
    list.forEach((item) => pushKeyword(bucket, item));
  };

  const ensureRule = (moduleId, nextRule) => {
    const normalizedModuleId = normalizeModuleId(moduleId);
    const previous = moduleRules[normalizedModuleId] ?? { mode: "none", typeKeys: [] };
    const normalizedNextRule = normalizeRule(nextRule);
    if (previous.mode === "types" && normalizedNextRule.mode === "types") {
      moduleRules[normalizedModuleId] = {
        mode: "types",
        typeKeys: Array.from(new Set([...previous.typeKeys, ...normalizedNextRule.typeKeys]))
      };
      return;
    }
    if (previous.mode !== "none") return;
    moduleRules[normalizedModuleId] = normalizedNextRule;
  };

  [...DEFAULT_HEADING_ALIASES, ...ADDITIONAL_HEADING_ALIASES].forEach((item) =>
    registerAlias(item.moduleId, item.keywords)
  );

  Object.entries(resolvedNodeLibrary).forEach(([rawType, definition]) => {
    const type = String(rawType ?? "").trim();
    if (!type) return;

    const moduleId = normalizeModuleId(type);
    registerAlias(moduleId, [
      type,
      String(type).replace(/[-_]+/g, " "),
      definition?.chip,
      ...collectLocalizedValues(definition?.title),
      ...collectLocalizedValues(definition?.label)
    ]);

    ensureRule(moduleId, { mode: "types", typeKeys: [normalizeTypeKey(type)] });
    const accentColor = toHexColorOrFallback(definition?.color, DEFAULT_GENERAL_ACCENT);
    moduleAccentColors[moduleId] = accentColor;
    moduleBackgroundColors[moduleId] = hexToRgba(accentColor, DEFAULT_MODULE_BACKGROUND_ALPHA);
  });

  const extraAliases = Array.isArray(options.headingAliases) ? options.headingAliases : [];
  extraAliases.forEach((item) => {
    if (!item || typeof item !== "object") return;
    registerAlias(item.moduleId, item.keywords);
  });

  const headingMatchers = Array.from(moduleKeywords.entries())
    .map(([moduleId, keywordSet]) => ({
      moduleId,
      keywords: Array.from(keywordSet).sort((a, b) => b.length - a.length)
    }))
    .filter((item) => item.keywords.length > 0)
    .sort((a, b) => {
      const aLongest = a.keywords[0]?.length ?? 0;
      const bLongest = b.keywords[0]?.length ?? 0;
      return bLongest - aLongest;
    });

  return {
    defaultModule: DEFAULT_MODULE_ID,
    moduleRules,
    headingMatchers,
    moduleBackgroundColors,
    moduleAccentColors
  };
}

export const DEFAULT_MARKDOWN_ASSOCIATION_CONFIG = buildMarkdownAssociationConfig();
const MAX_HIGHLIGHT_CODE_CHARS = 120000;
const MAX_HIGHLIGHT_CODE_LINES = 2000;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function normalizeLang(lang) {
  const value = String(lang || "").trim().toLowerCase();
  if (["js", "javascript", "node"].includes(value)) return "javascript";
  if (["ts", "typescript"].includes(value)) return "typescript";
  if (["py", "python"].includes(value)) return "python";
  if (["bash", "sh", "shell", "zsh"].includes(value)) return "bash";
  if (["json", "yaml", "yml", "md", "markdown"].includes(value)) return value;
  return value || "text";
}

function normalizeFenceLang(info) {
  const firstToken = String(info || "").trim().split(/\s+/)[0];
  return normalizeLang(firstToken || "text");
}

function highlightCodeLine(line, lang) {
  const keywordMap = {
    javascript: new Set([
      "const", "let", "var", "function", "return", "if", "else", "for", "while", "switch",
      "case", "break", "continue", "try", "catch", "finally", "throw", "new", "class",
      "extends", "import", "from", "export", "default", "await", "async", "null", "undefined",
      "true", "false"
    ]),
    typescript: new Set([
      "const", "let", "var", "function", "return", "if", "else", "for", "while", "switch",
      "case", "break", "continue", "try", "catch", "finally", "throw", "new", "class",
      "extends", "import", "from", "export", "default", "await", "async", "null", "undefined",
      "true", "false", "type", "interface", "enum", "implements", "readonly", "public",
      "private", "protected"
    ]),
    python: new Set([
      "def", "class", "return", "if", "elif", "else", "for", "while", "try", "except", "finally",
      "raise", "import", "from", "as", "with", "lambda", "pass", "break", "continue", "in", "is",
      "and", "or", "not", "None", "True", "False"
    ]),
    bash: new Set([
      "if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac", "function",
      "in", "echo", "export", "local", "return", "exit"
    ])
  };

  const keywords = keywordMap[lang] ?? new Set();
  const commentPrefix = lang === "python" || lang === "bash" ? "#" : "//";
  const tokenRegex = new RegExp(
    `${commentPrefix === "//" ? String.raw`\\/\\/.*$` : String.raw`#.*$`}` +
      `|` +
      String.raw`"(?:\\.|[^"\\])*"` +
      `|` +
      String.raw`'(?:\\.|[^'\\])*'` +
      `|` +
      String.raw`\\b\\d+(?:\\.\\d+)?\\b` +
      `|` +
      String.raw`\\b[a-zA-Z_][a-zA-Z0-9_]*\\b` +
      `|` +
      String.raw`[=><!+\\-*/%|&]+`,
    "g"
  );

  let result = "";
  let cursor = 0;
  let match;
  while ((match = tokenRegex.exec(line))) {
    const token = match[0];
    const start = match.index;
    if (start > cursor) {
      result += escapeHtml(line.slice(cursor, start));
    }

    let cls = "md-tok-op";
    if (token.startsWith("//") || token.startsWith("#")) {
      cls = "md-tok-comment";
    } else if (
      (token.startsWith("\"") && token.endsWith("\"")) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      cls = "md-tok-string";
    } else if (/^\d/.test(token)) {
      cls = "md-tok-number";
    } else if (keywords.has(token)) {
      cls = "md-tok-keyword";
    } else if (/^[a-zA-Z_]/.test(token)) {
      cls = "md-tok-name";
    }

    result += `<span class="${cls}">${escapeHtml(token)}</span>`;
    cursor = start + token.length;
  }

  if (cursor < line.length) {
    result += escapeHtml(line.slice(cursor));
  }
  return result;
}

export function highlightCode(code, lang) {
  const safeCode = typeof code === "string" ? code : String(code ?? "");
  const normalizedLang = normalizeLang(lang);
  if (!safeCode) return "";

  if (normalizedLang === "text" || normalizedLang === "markdown" || normalizedLang === "md") {
    return escapeHtml(safeCode);
  }

  // Guard the rendered preview against very large blocks that can freeze/crash
  // when tokenized on every render pass.
  if (safeCode.length > MAX_HIGHLIGHT_CODE_CHARS) {
    return escapeHtml(safeCode);
  }

  const lines = safeCode.split("\n");
  if (lines.length > MAX_HIGHLIGHT_CODE_LINES) {
    return escapeHtml(safeCode);
  }

  try {
    return lines
      .map((line) => {
        try {
          return highlightCodeLine(String(line ?? ""), normalizedLang);
        } catch {
          return escapeHtml(line ?? "");
        }
      })
      .join("\n");
  } catch {
    return escapeHtml(safeCode);
  }
}

function resolveModuleIdFromHeading(text, associationConfig = DEFAULT_MARKDOWN_ASSOCIATION_CONFIG) {
  const heading = String(text ?? "").toLowerCase();
  if (!heading) return associationConfig.defaultModule ?? DEFAULT_MODULE_ID;

  const matchers = Array.isArray(associationConfig?.headingMatchers)
    ? associationConfig.headingMatchers
    : [];

  for (const matcher of matchers) {
    const keywords = Array.isArray(matcher?.keywords) ? matcher.keywords : [];
    if (keywords.some((keyword) => heading.includes(String(keyword).toLowerCase()))) {
      return normalizeModuleId(matcher.moduleId, associationConfig.defaultModule ?? DEFAULT_MODULE_ID);
    }
  }

  return associationConfig.defaultModule ?? DEFAULT_MODULE_ID;
}

function toTableCellString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isMarkdownTableSeparator(cells) {
  if (!Array.isArray(cells) || !cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(String(cell || "").replace(/\s+/g, "")));
}

function parseMarkdownTableCells(line) {
  const raw = String(line ?? "").trim();
  if (!raw) return [];
  const normalized = raw.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buffer = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "\\" && next === "|") {
      buffer += "|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(toTableCellString(buffer));
      buffer = "";
      continue;
    }
    buffer += char;
  }

  cells.push(toTableCellString(buffer));
  return cells;
}

function normalizeMarkdownTableRow(cells, width) {
  return Array.from({ length: width }, (_, index) => toTableCellString(cells[index]));
}

function tableAlignmentsFromSeparator(cells, width) {
  return Array.from({ length: width }, (_, index) => {
    const token = String(cells[index] ?? "").replace(/\s+/g, "");
    if (!token) return "left";
    const starts = token.startsWith(":");
    const ends = token.endsWith(":");
    if (starts && ends) return "center";
    if (ends) return "right";
    return "left";
  });
}

function lineIndentSize(line) {
  const match = String(line ?? "").match(/^(\s*)/);
  return (match?.[1] ?? "").length;
}

function stripMarkdownListMarker(value) {
  return String(value ?? "")
    .trim()
    .replace(/^([-*+]|\d+\.)\s+/, "")
    .trim();
}

function parseIfElseBlock(lines, startIndex) {
  const line = lines[startIndex];
  const ifMatch = String(line ?? "").match(/^(\s*)IF\s*:\s*(.*)$/i);
  if (!ifMatch) return null;

  const baseIndent = (ifMatch[1] ?? "").length;
  const condition = stripMarkdownListMarker(ifMatch[2] ?? "");
  const thenLines = [];
  const elseLines = [];
  let mode = "then";
  let sawThen = false;
  let sawElse = false;
  let j = startIndex + 1;

  while (j < lines.length) {
    const candidate = lines[j];
    const trimmed = String(candidate ?? "").trim();
    const candidateIndent = lineIndentSize(candidate);

    if (!trimmed) {
      j += 1;
      continue;
    }

    if (/^THEN\s*:?\s*$/i.test(trimmed)) {
      mode = "then";
      sawThen = true;
      j += 1;
      continue;
    }

    const thenInlineMatch = trimmed.match(/^THEN\s*:\s*(.*)$/i);
    if (thenInlineMatch) {
      mode = "then";
      sawThen = true;
      const text = stripMarkdownListMarker(thenInlineMatch[1]);
      if (text) thenLines.push(text);
      j += 1;
      continue;
    }

    if (/^ELSE\s*:?\s*$/i.test(trimmed)) {
      mode = "else";
      sawElse = true;
      j += 1;
      continue;
    }

    const elseInlineMatch = trimmed.match(/^ELSE\s*:\s*(.*)$/i);
    if (elseInlineMatch) {
      mode = "else";
      sawElse = true;
      const text = stripMarkdownListMarker(elseInlineMatch[1]);
      if (text) elseLines.push(text);
      j += 1;
      continue;
    }

    // Keep parsing THEN/ELSE branch content even when bullets align with IF/THEN/ELSE.
    if (candidateIndent < baseIndent) break;
    if (/^\s*(#{1,6})\s+/.test(candidate) || /^\s*(```+|~~~+)/.test(candidate)) break;
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(candidate)) break;
    if (candidateIndent === baseIndent && /^IF\s*:/i.test(trimmed)) break;

    const text = stripMarkdownListMarker(trimmed);
    if (text) {
      if (mode === "else") {
        elseLines.push(text);
      } else {
        thenLines.push(text);
      }
    }
    j += 1;
  }

  if (!sawThen && !sawElse) return null;

  return {
    type: "ifelse",
    indent: Math.floor(baseIndent / 2),
    condition,
    thenLines,
    elseLines,
    text: [condition, ...thenLines, ...elseLines].filter(Boolean).join(" "),
    lineStart: startIndex,
    lineEnd: j
  };
}

export function parseMarkdownBlocks(markdown, associationConfig = DEFAULT_MARKDOWN_ASSOCIATION_CONFIG) {
  const lines = String(markdown || "").split("\n");
  const blocks = [];
  const resolvedAssociation =
    associationConfig && typeof associationConfig === "object"
      ? associationConfig
      : DEFAULT_MARKDOWN_ASSOCIATION_CONFIG;
  let currentModule = resolvedAssociation.defaultModule ?? DEFAULT_MODULE_ID;
  let i = 0;

  while (i < lines.length) {
    const blockLineStart = i;
    const line = lines[i];

    const fenceStart = line.match(/^\s*(```+|~~~+)\s*([^\n]*)$/);
    if (fenceStart) {
      const fence = fenceStart[1];
      const lang = normalizeFenceLang(fenceStart[2] ?? "");
      const fenceChar = fence[0];
      const fenceMinLen = fence.length;
      const fenceEndPattern = new RegExp(`^\\s*${fenceChar}{${fenceMinLen},}\\s*$`);
      const codeLines = [];
      i += 1;
      while (i < lines.length && !fenceEndPattern.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({
        type: "code",
        lang,
        code: codeLines.join("\n"),
        module: currentModule,
        lineStart: blockLineStart,
        lineEnd: i
      });
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (level === 2) {
        currentModule = resolveModuleIdFromHeading(text, resolvedAssociation);
      }
      blocks.push({
        type: "heading",
        level,
        text,
        module: currentModule,
        lineStart: blockLineStart,
        lineEnd: blockLineStart + 1
      });
      i += 1;
      continue;
    }

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({
        type: "hr",
        module: currentModule,
        text: "",
        lineStart: blockLineStart,
        lineEnd: blockLineStart + 1
      });
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length) {
      const headerCells = parseMarkdownTableCells(line);
      const separatorCells = parseMarkdownTableCells(lines[i + 1]);
      if (
        headerCells.length > 0 &&
        separatorCells.length > 0 &&
        isMarkdownTableSeparator(separatorCells)
      ) {
        let j = i + 2;
        const bodyRows = [];
        while (j < lines.length) {
          const candidate = lines[j];
          if (!candidate.trim() || !candidate.includes("|")) break;
          if (/^\s*(```+|~~~+)/.test(candidate)) break;
          if (/^\s*(#{1,6})\s+/.test(candidate)) break;
          if (/^\s*>/.test(candidate)) break;
          if (/^\s*([-*+]|\d+\.)\s+/.test(candidate) && !candidate.trim().startsWith("|")) break;
          bodyRows.push(parseMarkdownTableCells(candidate));
          j += 1;
        }

        const width = Math.max(
          headerCells.length,
          separatorCells.length,
          ...bodyRows.map((row) => row.length),
          1
        );
        const normalizedHeaders = normalizeMarkdownTableRow(headerCells, width);
        const normalizedRows = (bodyRows.length ? bodyRows : [Array.from({ length: width }, () => "")])
          .map((row) => normalizeMarkdownTableRow(row, width));

        blocks.push({
          type: "table",
          headers: normalizedHeaders,
          rows: normalizedRows,
          alignments: tableAlignmentsFromSeparator(separatorCells, width),
          text: [normalizedHeaders.join(" "), ...normalizedRows.map((row) => row.join(" "))].join(" "),
          module: currentModule,
          lineStart: blockLineStart,
          lineEnd: j
        });
        i = j;
        continue;
      }
    }

    const ifElseBlock = parseIfElseBlock(lines, i);
    if (ifElseBlock) {
      blocks.push({
        ...ifElseBlock,
        module: currentModule
      });
      i = ifElseBlock.lineEnd;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      let j = i;
      while (j < lines.length) {
        const match = lines[j].match(/^\s*>\s?(.*)$/);
        if (!match) break;
        quoteLines.push(match[1]);
        j += 1;
      }
      blocks.push({
        type: "quote",
        lines: quoteLines,
        text: quoteLines.join("\n"),
        module: currentModule,
        lineStart: blockLineStart,
        lineEnd: j
      });
      i = j;
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = Math.floor((listMatch[1] || "").length / 2);
      blocks.push({
        type: "list",
        indent,
        marker: listMatch[2],
        text: listMatch[3],
        module: currentModule,
        lineStart: blockLineStart,
        lineEnd: blockLineStart + 1
      });
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const paragraphLines = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```+|~~~+)/.test(lines[i]) &&
      !/^\s*(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*IF\s*:/i.test(lines[i]) &&
      !/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(lines[i]) &&
      !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !(
        lines[i].includes("|") &&
        i + 1 < lines.length &&
        isMarkdownTableSeparator(parseMarkdownTableCells(lines[i + 1]))
      )
    ) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
      module: currentModule,
      lineStart: blockLineStart,
      lineEnd: i
    });
  }

  return blocks;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blockIncludesNodeLabel(text, label) {
  const source = String(text || "");
  const target = String(label || "").trim();
  if (!source || !target) return false;

  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();
  if (sourceLower.includes(targetLower)) return true;

  if (/^[A-Za-z0-9_.\-\s]+$/.test(target)) {
    const boundaryPattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(targetLower)}([^A-Za-z0-9_]|$)`, "i");
    return boundaryPattern.test(sourceLower);
  }

  return false;
}

function fallbackNodeIdsByModule(moduleId, nodes, associationConfig = DEFAULT_MARKDOWN_ASSOCIATION_CONFIG) {
  const normalizedModuleId = normalizeModuleId(moduleId, associationConfig.defaultModule ?? DEFAULT_MODULE_ID);
  const fallbackModuleId = normalizeModuleId(
    associationConfig.defaultModule ?? DEFAULT_MODULE_ID,
    DEFAULT_MODULE_ID
  );
  const ruleMap = associationConfig?.moduleRules ?? {};
  const rule = normalizeRule(ruleMap[normalizedModuleId] ?? ruleMap[fallbackModuleId] ?? { mode: "none" });

  if (rule.mode === "all") {
    return nodes.map((node) => node.id);
  }

  if (rule.mode === "foldered") {
    return nodes.filter((node) => node.folderId).map((node) => node.id);
  }

  if (rule.mode === "types") {
    const typeKeySet = new Set(rule.typeKeys.map((item) => normalizeTypeKey(item)));
    return nodes
      .filter((node) => typeKeySet.has(normalizeTypeKey(node.type)))
      .map((node) => node.id);
  }

  return [];
}

function nodeIdFromHeadingText(text, nodes) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/^\d+\.\s*/, "").trim();
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const exact = nodes.find((node) => node.label && node.label.toLowerCase() === lower);
  if (exact) return exact.id;

  const fuzzy = nodes.find((node) => node.label && blockIncludesNodeLabel(raw, node.label));
  return fuzzy?.id ?? null;
}

export function annotateMarkdownBlocks(
  blocks,
  nodes,
  associationConfig = DEFAULT_MARKDOWN_ASSOCIATION_CONFIG
) {
  const resolvedAssociation =
    associationConfig && typeof associationConfig === "object"
      ? associationConfig
      : DEFAULT_MARKDOWN_ASSOCIATION_CONFIG;
  const normalizedNodes = nodes
    .map((node) => ({
      id: node.id,
      type: node.type,
      label: String(node.label || "").trim(),
      folderId: node.params?.folderId
    }))
    .filter((node) => node.id);
  const normalizedNodeMap = new Map(
    normalizedNodes.map((node) => [node.id, node])
  );
  const nodeOrderMap = new Map(normalizedNodes.map((node, index) => [node.id, index]));
  const getNodeOrder = (nodeId) => nodeOrderMap.get(nodeId) ?? Number.MAX_SAFE_INTEGER;
  let lastSectionOrder = -1;
  let currentSectionNodeId = null;

  const inferHeadingNodeByModule = (moduleId) => {
    const candidates = fallbackNodeIdsByModule(moduleId, normalizedNodes, resolvedAssociation)
      .filter((nodeId) => normalizedNodeMap.has(nodeId))
      .sort((a, b) => getNodeOrder(a) - getNodeOrder(b));
    if (!candidates.length) return null;
    const forward = candidates.find((nodeId) => getNodeOrder(nodeId) > lastSectionOrder);
    return forward ?? candidates[0];
  };

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      let headingNodeId = nodeIdFromHeadingText(block.text, normalizedNodes);
      if (!headingNodeId && (block.level ?? 0) <= 2) {
        headingNodeId = inferHeadingNodeByModule(block.module);
      }
      if (headingNodeId) {
        currentSectionNodeId = headingNodeId;
        lastSectionOrder = Math.max(lastSectionOrder, getNodeOrder(headingNodeId));
      } else if ((block.level ?? 0) <= 2) {
        currentSectionNodeId = null;
      }
    }

    const sourceText = (() => {
      if (block.type === "code") return block.code;
      if (block.type === "table") {
        const headers = Array.isArray(block.headers) ? block.headers : [];
        const rows = Array.isArray(block.rows) ? block.rows.flat() : [];
        return [...headers, ...rows].join(" ");
      }
      if (block.type === "quote") {
        return Array.isArray(block.lines) ? block.lines.join("\n") : block.text;
      }
      if (block.type === "ifelse") {
        return [
          block.condition,
          ...(Array.isArray(block.thenLines) ? block.thenLines : []),
          ...(Array.isArray(block.elseLines) ? block.elseLines : [])
        ].join("\n");
      }
      return block.text;
    })();
    const relatedByLabel = normalizedNodes
      .filter((node) => node.label && blockIncludesNodeLabel(sourceText, node.label))
      .map((node) => node.id);

    const contextualIds = currentSectionNodeId
      ? [
          currentSectionNodeId,
          ...relatedByLabel.filter((nodeId) => nodeId !== currentSectionNodeId)
        ]
      : relatedByLabel.length
        ? relatedByLabel
        : fallbackNodeIdsByModule(block.module, normalizedNodes, resolvedAssociation);

    const relatedNodeIds = Array.from(
      new Set(contextualIds)
    );
    const primaryNodeId = relatedNodeIds[0] ?? null;
    const primaryNode = primaryNodeId ? normalizedNodeMap.get(primaryNodeId) : null;
    const hasDirectContext = Boolean(primaryNodeId);
    const resolvedModule = hasDirectContext && primaryNode?.type
      ? normalizeModuleId(primaryNode.type, resolvedAssociation.defaultModule ?? DEFAULT_MODULE_ID)
      : normalizeModuleId(block.module, resolvedAssociation.defaultModule ?? DEFAULT_MODULE_ID);

    return {
      ...block,
      id: `md-block-${index + 1}`,
      module: resolvedModule,
      relatedNodeIds,
      primaryNodeId
    };
  });
}

function renderParamStyledText(text, keyPrefix) {
  const value = String(text || "");
  if (!value) return <span key={`${keyPrefix}-empty`} />;

  const parts = [];
  const regex = new RegExp(PARAM_LABEL_REGEX.source, "giu");
  let cursor = 0;
  let hitIndex = 0;
  let match;

  while ((match = regex.exec(value))) {
    const start = match.index;
    if (start > cursor) {
      parts.push(<span key={`${keyPrefix}-text-${hitIndex}`}>{value.slice(cursor, start)}</span>);
    }

    parts.push(
      <span className="md-param-key" key={`${keyPrefix}-param-${hitIndex}`}>
        {match[1]}
        {match[2]}
      </span>
    );
    cursor = start + match[0].length;
    hitIndex += 1;
  }

  if (cursor < value.length) {
    parts.push(<span key={`${keyPrefix}-tail`}>{value.slice(cursor)}</span>);
  }

  return parts;
}

export function renderInlineText(text) {
  const parts = String(text ?? "").split(
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g
  );

  return parts
    .filter((part) => part !== "")
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code className="md-inline-code" key={`code-${index}`}>
            {part.slice(1, -1)}
          </code>
        );
      }

      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        const inner = part.slice(2, -2);
        return (
          <strong className="md-inline-strong" key={`strong-${index}`}>
            {renderParamStyledText(inner, `strong-${index}`)}
          </strong>
        );
      }

      if (part.startsWith("~~") && part.endsWith("~~")) {
        return (
          <del className="md-inline-strike" key={`strike-${index}`}>
            {renderParamStyledText(part.slice(2, -2), `strike-${index}`)}
          </del>
        );
      }

      if (part.startsWith("==") && part.endsWith("==")) {
        return (
          <mark className="md-inline-highlight" key={`mark-${index}`}>
            {renderParamStyledText(part.slice(2, -2), `mark-${index}`)}
          </mark>
        );
      }

      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const label = linkMatch[1];
          const href = linkMatch[2].trim();
          const safeHref = /^(https?:\/\/|mailto:)/i.test(href) ? href : "#";
          return (
            <a
              className="md-inline-link"
              href={safeHref}
              key={`link-${index}`}
              rel="noopener noreferrer"
              target={safeHref === "#" ? undefined : "_blank"}
            >
              {renderParamStyledText(label, `link-${index}`)}
            </a>
          );
        }
      }

      if (
        (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
        (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      ) {
        return (
          <em className="md-inline-em" key={`em-${index}`}>
            {renderParamStyledText(part.slice(1, -1), `em-${index}`)}
          </em>
        );
      }

      return <span key={`txt-${index}`}>{renderParamStyledText(part, `txt-${index}`)}</span>;
    });
}
