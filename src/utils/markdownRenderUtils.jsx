const MODULE_NODE_TYPES = {
  metadata: new Set(["*"]),
  prereq: new Set(["*"]),
  env: new Set(["*"]),
  workflow: new Set(["*"]),
  topology: new Set(["*"]),
  paths: new Set(["*"]),
  guardrail: new Set(["*"]),
  folders: new Set(["*foldered"]),
  notes: new Set(["*"]),
  general: new Set()
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
  const normalizedLang = normalizeLang(lang);
  if (normalizedLang === "text" || normalizedLang === "markdown" || normalizedLang === "md") {
    return escapeHtml(code);
  }
  return String(code)
    .split("\n")
    .map((line) => highlightCodeLine(line, normalizedLang))
    .join("\n");
}

function resolveModuleIdFromHeading(text) {
  const raw = String(text || "");
  const heading = raw.toLowerCase();

  if (heading.includes("overview") || raw.includes("概览")) return "metadata";
  if (heading.includes("node modules") || raw.includes("节点模块")) return "workflow";
  if (heading.includes("metadata") || raw.includes("元数据")) return "metadata";
  if (heading.includes("prerequisite") || raw.includes("前置")) return "prereq";
  if (heading.includes("environment") || raw.includes("环境")) return "env";
  if (heading.includes("workflow") || raw.includes("工作流")) return "workflow";
  if (heading.includes("node composition") || raw.includes("节点编排")) return "workflow";
  if (heading.includes("topology") || raw.includes("拓扑")) return "topology";
  if (heading.includes("execution paths") || raw.includes("执行路径")) return "paths";
  if (heading.includes("guardrails") || raw.includes("护栏")) return "guardrail";
  if (heading.includes("folders") || raw.includes("文件夹")) return "folders";
  if (heading.includes("execution notes") || raw.includes("执行说明")) return "notes";
  if (heading.includes("composer notes") || raw.includes("编排说明")) return "notes";
  return "general";
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

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || "").split("\n");
  const blocks = [];
  let currentModule = "general";
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
        currentModule = resolveModuleIdFromHeading(text);
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

function fallbackNodeIdsByModule(moduleId, nodes) {
  const config = MODULE_NODE_TYPES[moduleId] ?? MODULE_NODE_TYPES.general;
  if (config.has("*")) {
    return nodes.map((node) => node.id);
  }
  if (config.has("*foldered")) {
    return nodes.filter((node) => node.params?.folderId).map((node) => node.id);
  }
  return nodes.filter((node) => config.has(node.type)).map((node) => node.id);
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

export function annotateMarkdownBlocks(blocks, nodes) {
  const normalizedNodes = nodes
    .map((node) => ({
      id: node.id,
      type: node.type,
      label: String(node.label || "").trim(),
      folderId: node.params?.folderId
    }))
    .filter((node) => node.id);
  let currentSectionNodeId = null;

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      const headingNodeId = nodeIdFromHeadingText(block.text, normalizedNodes);
      if (headingNodeId) {
        currentSectionNodeId = headingNodeId;
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
      return block.text;
    })();
    const relatedByLabel = normalizedNodes
      .filter((node) => node.label && blockIncludesNodeLabel(sourceText, node.label))
      .map((node) => node.id);

    const contextualIds =
      relatedByLabel.length
        ? relatedByLabel
        : currentSectionNodeId
          ? [currentSectionNodeId]
          : fallbackNodeIdsByModule(block.module, normalizedNodes);

    const relatedNodeIds = Array.from(
      new Set(contextualIds)
    );

    return {
      ...block,
      id: `md-block-${index + 1}`,
      relatedNodeIds,
      primaryNodeId: relatedNodeIds[0] ?? null
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
