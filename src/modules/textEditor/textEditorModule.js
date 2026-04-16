import { MODULE_BACKGROUND_COLORS } from "../../utils/markdownRenderUtils";

function createRawEditorStyle({ currentMarkdown, isModuleColorMappingOn, markdownBlocks }) {
  if (!isModuleColorMappingOn) return undefined;

  const totalLines = Math.max(String(currentMarkdown ?? "").split("\n").length, 1);
  const sortedBlocks = [...markdownBlocks].sort(
    (a, b) => (a.lineStart ?? 0) - (b.lineStart ?? 0)
  );
  const segments = [];
  let cursor = 0;

  sortedBlocks.forEach((block) => {
    const startLine = Math.max(0, Math.min(totalLines, block.lineStart ?? 0));
    const endLine = Math.max(
      startLine,
      Math.min(totalLines, Math.max(startLine + 1, block.lineEnd ?? startLine + 1))
    );

    if (startLine > cursor) {
      const gapStart = ((cursor / totalLines) * 100).toFixed(3);
      const gapEnd = ((startLine / totalLines) * 100).toFixed(3);
      segments.push(
        `${MODULE_BACKGROUND_COLORS.general} ${gapStart}%, ${MODULE_BACKGROUND_COLORS.general} ${gapEnd}%`
      );
    }

    const start = ((startLine / totalLines) * 100).toFixed(3);
    const end = ((endLine / totalLines) * 100).toFixed(3);
    const color = MODULE_BACKGROUND_COLORS[block.module] ?? MODULE_BACKGROUND_COLORS.general;
    segments.push(`${color} ${start}%, ${color} ${end}%`);
    cursor = Math.max(cursor, endLine);
  });

  if (cursor < totalLines) {
    const tailStart = ((cursor / totalLines) * 100).toFixed(3);
    segments.push(
      `${MODULE_BACKGROUND_COLORS.general} ${tailStart}%, ${MODULE_BACKGROUND_COLORS.general} 100%`
    );
  }

  if (!segments.length) {
    segments.push(`${MODULE_BACKGROUND_COLORS.general} 0%, ${MODULE_BACKGROUND_COLORS.general} 100%`);
  }

  return {
    backgroundImage: `linear-gradient(180deg, ${segments.join(", ")})`,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    backgroundAttachment: "local",
    backgroundRepeat: "no-repeat"
  };
}

function setMarkdownBlockRef(markdownBlockRefs, blockId, element) {
  if (!blockId) return;
  if (element) {
    markdownBlockRefs.current.set(blockId, element);
    return;
  }
  markdownBlockRefs.current.delete(blockId);
}

function activateMarkdownBlock({ block, setActiveMarkdownBlockId, selectNodes }) {
  if (!block) return;
  setActiveMarkdownBlockId(block.id);
  if (block.relatedNodeIds.length) {
    selectNodes(block.relatedNodeIds, block.relatedNodeIds[0]);
  }
}

function focusMarkdownBlockByIndex({
  index,
  markdownBlocks,
  onActivateMarkdownBlock,
  markdownBlockRefs
}) {
  const block = markdownBlocks[index];
  if (!block) return;
  onActivateMarkdownBlock(block);
  const target = markdownBlockRefs.current.get(block.id);
  if (target && typeof target.focus === "function") {
    target.focus();
  }
}

function handleMarkdownBlockKeyDown({
  event,
  blockIndex,
  markdownBlocks,
  focusMarkdownBlockByIndex
}) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusMarkdownBlockByIndex(Math.min(markdownBlocks.length - 1, blockIndex + 1));
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusMarkdownBlockByIndex(Math.max(0, blockIndex - 1));
  }
}

function syncNodeSelectionFromRawEditor({
  textarea,
  activeDoc,
  markdownViewMode,
  markdownBlocks,
  activeMarkdownBlockId,
  setActiveMarkdownBlockId,
  effectiveSelectedNodeIds,
  selectedNodeIdSet,
  selectNodes
}) {
  if (!textarea || activeDoc !== "skill" || markdownViewMode !== "raw") return;
  if (!markdownBlocks.length) return;

  const cursor = Math.max(0, textarea.selectionStart ?? 0);
  const line = textarea.value.slice(0, cursor).split("\n").length - 1;
  const matched =
    markdownBlocks.find(
      (block) =>
        line >= (block.lineStart ?? 0) &&
        line < Math.max((block.lineStart ?? 0) + 1, block.lineEnd ?? (block.lineStart ?? 0) + 1)
    ) ??
    markdownBlocks.find((block) => (block.lineStart ?? 0) >= line) ??
    markdownBlocks[markdownBlocks.length - 1];

  if (!matched) return;
  if (activeMarkdownBlockId !== matched.id) {
    setActiveMarkdownBlockId(matched.id);
  }

  const relatedIds = Array.from(new Set(matched.relatedNodeIds ?? []));
  if (!relatedIds.length) return;

  const sameSelection =
    relatedIds.length === effectiveSelectedNodeIds.length &&
    relatedIds.every((id) => selectedNodeIdSet.has(id));
  if (!sameSelection) {
    selectNodes(relatedIds, relatedIds[0]);
  }
}

function moveCaret(textarea, nextPosition) {
  const safe = Math.max(0, Math.min(nextPosition, textarea.value.length));
  textarea.setSelectionRange(safe, safe);
}

function lineStartAt(text, position) {
  const index = text.lastIndexOf("\n", Math.max(0, position - 1));
  return index === -1 ? 0 : index + 1;
}

function lineEndAt(text, position) {
  const index = text.indexOf("\n", position);
  return index === -1 ? text.length : index;
}

function scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef }) {
  requestAnimationFrame(() => syncNodeSelectionFromRawEditor(markdownTextareaRef.current));
}

function handleRawEditorKeyDown({
  event,
  activeDoc,
  vimSubMode,
  setVimSubMode,
  setSkillMarkdown,
  syncNodeSelectionFromRawEditor,
  markdownTextareaRef
}) {
  if (activeDoc !== "skill") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const textarea = event.currentTarget;
  const textValue = textarea.value;
  const pos = textarea.selectionStart ?? 0;

  if (vimSubMode === "insert") {
    if (event.key === "Escape") {
      event.preventDefault();
      setVimSubMode("normal");
      scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    }
    return;
  }

  event.preventDefault();

  if (event.key === "i") {
    setVimSubMode("insert");
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "a") {
    moveCaret(textarea, pos + 1);
    setVimSubMode("insert");
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "A") {
    moveCaret(textarea, lineEndAt(textValue, pos));
    setVimSubMode("insert");
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "0") {
    moveCaret(textarea, lineStartAt(textValue, pos));
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "$") {
    moveCaret(textarea, lineEndAt(textValue, pos));
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "h" || event.key === "ArrowLeft") {
    moveCaret(textarea, pos - 1);
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "l" || event.key === "ArrowRight") {
    moveCaret(textarea, pos + 1);
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "k" || event.key === "ArrowUp") {
    const currentLineStart = lineStartAt(textValue, pos);
    if (currentLineStart === 0) return;
    const previousLineEnd = currentLineStart - 1;
    const previousLineStart = lineStartAt(textValue, previousLineEnd);
    const targetColumn = pos - currentLineStart;
    moveCaret(
      textarea,
      previousLineStart + Math.min(targetColumn, previousLineEnd - previousLineStart)
    );
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "j" || event.key === "ArrowDown") {
    const currentLineStart = lineStartAt(textValue, pos);
    const currentLineEnd = lineEndAt(textValue, pos);
    if (currentLineEnd >= textValue.length) return;
    const nextLineStart = currentLineEnd + 1;
    const nextLineEnd = lineEndAt(textValue, nextLineStart);
    const targetColumn = pos - currentLineStart;
    moveCaret(textarea, nextLineStart + Math.min(targetColumn, nextLineEnd - nextLineStart));
    scheduleRawEditorSelectionSync({ syncNodeSelectionFromRawEditor, markdownTextareaRef });
    return;
  }

  if (event.key === "x") {
    if (pos >= textValue.length) return;
    const next = `${textValue.slice(0, pos)}${textValue.slice(pos + 1)}`;
    setSkillMarkdown(next);
    requestAnimationFrame(() => {
      const target = markdownTextareaRef.current;
      if (target) {
        moveCaret(target, pos);
        syncNodeSelectionFromRawEditor(target);
      }
    });
    return;
  }

  if (event.key === "o") {
    const currentLineEnd = lineEndAt(textValue, pos);
    const insertionPoint = currentLineEnd;
    const next = `${textValue.slice(0, insertionPoint)}\n${textValue.slice(insertionPoint)}`;
    setSkillMarkdown(next);
    setVimSubMode("insert");
    requestAnimationFrame(() => {
      const target = markdownTextareaRef.current;
      if (target) {
        moveCaret(target, insertionPoint + 1);
        syncNodeSelectionFromRawEditor(target);
      }
    });
  }
}

function normalizeEditableText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ");
}

function buildLinesForEditedBlock(block, nextText) {
  const normalized = normalizeEditableText(nextText);
  const textLines = normalized.split("\n");

  if (block.type === "heading") {
    const first = textLines[0] ?? "";
    return [`${"#".repeat(block.level)} ${first}`];
  }

  if (block.type === "list") {
    const marker = block.marker || "-";
    const prefix = `${"  ".repeat(block.indent)}${marker} `;
    return (textLines.length ? textLines : [""]).map((line) => `${prefix}${line}`);
  }

  if (block.type === "quote") {
    return (textLines.length ? textLines : [""]).map((line) => `> ${line}`);
  }

  if (block.type === "hr") {
    return ["---"];
  }

  if (block.type === "code") {
    const lang = block.lang && block.lang !== "text" ? block.lang : "";
    const bodyLines = textLines.length ? textLines : [""];
    return [`\`\`\`${lang}`, ...bodyLines, "```"];
  }

  return textLines.length ? textLines : [""];
}

function applyRenderedBlockEdit({
  blockId,
  nextText,
  markdownBlockMap,
  skillMarkdown,
  isDocMappingLive,
  setIsDocMappingLive,
  setSkillMarkdown
}) {
  const block = markdownBlockMap.get(blockId);
  if (!block) return;

  const allLines = skillMarkdown.split("\n");
  const start = Math.max(0, block.lineStart ?? 0);
  const end = Math.max(start + 1, block.lineEnd ?? start + 1);
  const replacementLines = buildLinesForEditedBlock(block, nextText);
  const nextLines = [
    ...allLines.slice(0, start),
    ...replacementLines,
    ...allLines.slice(end)
  ];
  const nextMarkdown = nextLines.join("\n");
  if (nextMarkdown === skillMarkdown) return;

  if (isDocMappingLive) {
    setIsDocMappingLive(false);
  }
  setSkillMarkdown(nextMarkdown);
}

export {
  createRawEditorStyle,
  setMarkdownBlockRef,
  activateMarkdownBlock,
  focusMarkdownBlockByIndex,
  handleMarkdownBlockKeyDown,
  syncNodeSelectionFromRawEditor,
  handleRawEditorKeyDown,
  applyRenderedBlockEdit
};
