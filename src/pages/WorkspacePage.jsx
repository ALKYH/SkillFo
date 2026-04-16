import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { fetchForgeMarketplace } from "../services/forgeMarketplaceApi";
import {
  annotateMarkdownBlocks,
  buildMarkdownAssociationConfig,
  highlightCode,
  normalizeLang,
  parseMarkdownBlocks,
  renderInlineText
} from "../utils/markdownRenderUtils";

import {
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
  snapToGrid
} from "../modules/nodeEditor/nodeEditorModule";
import {
  createRawEditorStyle,
  setMarkdownBlockRef as setMarkdownBlockRefInEditor,
  activateMarkdownBlock,
  focusMarkdownBlockByIndex as focusMarkdownBlockByIndexInEditor,
  handleMarkdownBlockKeyDown as handleMarkdownBlockKeyDownInEditor,
  syncNodeSelectionFromRawEditor as syncNodeSelectionFromRawEditorInEditor,
  handleRawEditorKeyDown as handleRawEditorKeyDownInEditor,
  applyRenderedBlockEdit as applyRenderedBlockEditInEditor
} from "../modules/textEditor/textEditorModule";

function WorkspacePage() {
  const { locale, t: i18nT } = useI18n();
  const isZh = locale.startsWith("zh");
  // Route all page-local bilingual text through the i18n framework with explicit keys.
  const t = (zh, en, key) => i18nT(key, isZh ? zh : en);

  const [viewMode, setViewMode] = useState("split");
  const [graph, setGraph] = useState(() => cloneGraph(INITIAL_GRAPH));
  const [undoStack, setUndoStack] = useState([]);
  const [activeDoc, setActiveDoc] = useState("skill");
  const [isDocMappingLive, setIsDocMappingLive] = useState(true);
  const [markdownViewMode, setMarkdownViewMode] = useState("raw");
  const [isModuleColorMappingOn, setIsModuleColorMappingOn] = useState(true);
  const [vimSubMode, setVimSubMode] = useState("normal");
  const [folderToolArmed, setFolderToolArmed] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState(null);
  const [marqueeStart, setMarqueeStart] = useState(null);
  const [nodeMarqueeRect, setNodeMarqueeRect] = useState(null);
  const [nodeMarqueeStart, setNodeMarqueeStart] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [connectionDragState, setConnectionDragState] = useState(null);
  const [copied, setCopied] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState("library");
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryGroupOpen, setLibraryGroupOpen] = useState({
    builtin: true,
    imported: true,
    downloaded: true
  });
  const [importedNodePacks] = useState(() => readUserImportedNodePacks());
  const [downloadedNodePacks, setDownloadedNodePacks] = useState([]);
  const [downloadedNodePacksLoading, setDownloadedNodePacksLoading] = useState(true);
  const [downloadedNodePacksError, setDownloadedNodePacksError] = useState("");
  const [skillMarkdown, setSkillMarkdown] = useState("");
  const [activeMarkdownBlockId, setActiveMarkdownBlockId] = useState(null);
  const clipboardRef = useRef(null);
  const canvasRef = useRef(null);
  const markdownPaneRef = useRef(null);
  const markdownBlockRefs = useRef(new Map());
  const markdownTextareaRef = useRef(null);
  const didNodeDragMoveRef = useRef(false);
  const suppressNodeClickRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setDownloadedNodePacksLoading(true);
      setDownloadedNodePacksError("");

      try {
        const result = await fetchForgeMarketplace(
          {
            type: "node-pack",
            sortBy: "downloads",
            page: 1,
            pageSize: 8
          },
          { signal: controller.signal }
        );

        setDownloadedNodePacks(result.items ?? []);
      } catch (error) {
        if (error.name === "AbortError") return;
        setDownloadedNodePacks([]);
        setDownloadedNodePacksError(error.message || "Failed to load node packs.");
      } finally {
        setDownloadedNodePacksLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, []);

  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const matchLibraryQuery = (parts) => {
    if (!normalizedLibraryQuery) return true;
    return parts.join(" ").toLowerCase().includes(normalizedLibraryQuery);
  };

  const builtinNodes = useMemo(
    () =>
      Object.entries(NODE_LIBRARY)
        .filter(([type]) => type !== "metadata")
        .map(([type, definition]) => ({
          id: `builtin-${type}`,
          type,
          chip: definition.chip,
          title: pick(definition.title, isZh)
        }))
        .filter((item) => matchLibraryQuery([item.type, item.chip, item.title])),
    [isZh, normalizedLibraryQuery]
  );

  const filteredImportedNodePacks = useMemo(
    () =>
      importedNodePacks.filter((item) =>
        matchLibraryQuery([item.title, item.description, ...(item.tags ?? [])])
      ),
    [importedNodePacks, normalizedLibraryQuery]
  );

  const filteredDownloadedNodePacks = useMemo(
    () =>
      downloadedNodePacks.filter((item) =>
        matchLibraryQuery([item.title, item.description, item.author, ...(item.tags ?? [])])
      ),
    [downloadedNodePacks, normalizedLibraryQuery]
  );

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === graph.selectedNodeId) ?? null,
    [graph.nodes, graph.selectedNodeId]
  );

  const selectedFolder = useMemo(
    () => graph.folders.find((folder) => folder.id === graph.selectedFolderId) ?? null,
    [graph.folders, graph.selectedFolderId]
  );

  const effectiveSelectedNodeIds = useMemo(() => {
    const idSet = new Set(selectedNodeIds);
    if (graph.selectedNodeId) idSet.add(graph.selectedNodeId);
    return Array.from(idSet);
  }, [graph.selectedNodeId, selectedNodeIds]);

  const selectedNodes = useMemo(
    () => graph.nodes.filter((node) => effectiveSelectedNodeIds.includes(node.id)),
    [effectiveSelectedNodeIds, graph.nodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map();
    graph.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graph.nodes]);

  const edgePaths = useMemo(
    () =>
      graph.edges
        .map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H * 0.5;
          const x2 = to.x;
          const y2 = to.y + NODE_H * 0.5;
          return {
            ...edge,
            d: buildEdgeCurvePath(x1, y1, x2, y2),
            lx: (x1 + x2) * 0.5,
            ly: (y1 + y2) * 0.5 - 8
          };
        })
        .filter(Boolean),
    [graph.edges, nodeMap]
  );

  const connectionPreviewPath = useMemo(() => {
    if (!connectionDragState) return null;
    const sourceNode = nodeMap.get(connectionDragState.nodeId);
    if (!sourceNode) return null;

    const hoverNode = connectionDragState.hoverNodeId
      ? nodeMap.get(connectionDragState.hoverNodeId) ?? null
      : null;

    let x1 = connectionDragState.currentPoint.x;
    let y1 = connectionDragState.currentPoint.y;
    let x2 = sourceNode.x;
    let y2 = sourceNode.y + NODE_H * 0.5;

    if (connectionDragState.direction === "out") {
      x1 = sourceNode.x + NODE_W;
      y1 = sourceNode.y + NODE_H * 0.5;
      x2 = hoverNode ? hoverNode.x : connectionDragState.currentPoint.x;
      y2 = hoverNode ? hoverNode.y + NODE_H * 0.5 : connectionDragState.currentPoint.y;
    } else {
      x1 = hoverNode ? hoverNode.x + NODE_W : connectionDragState.currentPoint.x;
      y1 = hoverNode ? hoverNode.y + NODE_H * 0.5 : connectionDragState.currentPoint.y;
      x2 = sourceNode.x;
      y2 = sourceNode.y + NODE_H * 0.5;
    }

    return { d: buildEdgeCurvePath(x1, y1, x2, y2) };
  }, [connectionDragState, nodeMap]);

  const generatedSkillMarkdown = useMemo(() => generateSkillMarkdown(graph, isZh), [graph, isZh]);
  const generatedSkillfoMarkdown = useMemo(
    () =>
      generateSkillfoMarkdown(
        graph,
        {
          viewMode,
          isDocMappingLive,
          markdownViewMode,
          isModuleColorMappingOn,
          vimSubMode,
          activeDoc,
          selectedNodeCount: effectiveSelectedNodeIds.length
        },
        isZh
      ),
    [activeDoc, effectiveSelectedNodeIds.length, graph, isDocMappingLive, isModuleColorMappingOn, isZh, markdownViewMode, viewMode, vimSubMode]
  );
  const activeDocumentName = activeDoc === "skillfo" ? "SKILLFO.md" : "SKILL.md";
  const currentMarkdown = activeDoc === "skillfo" ? generatedSkillfoMarkdown : skillMarkdown;
  const markdownAssociationConfig = useMemo(
    () => buildMarkdownAssociationConfig(NODE_LIBRARY),
    []
  );
  const markdownLines = currentMarkdown.split("\n").length;
  const markdownChars = currentMarkdown.length;
  const markdownBlocks = useMemo(
    () =>
      annotateMarkdownBlocks(
        parseMarkdownBlocks(currentMarkdown, markdownAssociationConfig),
        graph.nodes,
        markdownAssociationConfig
      ),
    [currentMarkdown, graph.nodes, markdownAssociationConfig]
  );
  const selectedNodeIdSet = useMemo(() => new Set(effectiveSelectedNodeIds), [effectiveSelectedNodeIds]);
  const activeMarkdownBlock = useMemo(
    () => markdownBlocks.find((block) => block.id === activeMarkdownBlockId) ?? null,
    [activeMarkdownBlockId, markdownBlocks]
  );
  const activeMarkdownNodeIds = activeMarkdownBlock?.relatedNodeIds ?? [];
  const activeMarkdownNodeIdSet = useMemo(() => new Set(activeMarkdownNodeIds), [activeMarkdownNodeIds]);
  const markdownBlockMap = useMemo(
    () => new Map(markdownBlocks.map((block) => [block.id, block])),
    [markdownBlocks]
  );
  const rawEditorReadOnly = vimSubMode === "normal";
  const isRenderedEditable = false;
  const shouldShowStatusline = true;
  const rawEditorStyle = useMemo(
    () =>
      createRawEditorStyle({
        currentMarkdown,
        isModuleColorMappingOn,
        markdownBlocks,
        moduleBackgroundColors: markdownAssociationConfig.moduleBackgroundColors
      }),
    [currentMarkdown, isModuleColorMappingOn, markdownAssociationConfig.moduleBackgroundColors, markdownBlocks]
  );

  useEffect(() => {
    if (isDocMappingLive) {
      setSkillMarkdown(generatedSkillMarkdown);
    }
  }, [generatedSkillMarkdown, isDocMappingLive]);

  useEffect(() => {
    if (!activeMarkdownBlockId) return;
    if (markdownBlocks.some((block) => block.id === activeMarkdownBlockId)) return;
    setActiveMarkdownBlockId(null);
  }, [activeMarkdownBlockId, markdownBlocks]);

  useEffect(() => {
    if (!effectiveSelectedNodeIds.length || !markdownBlocks.length) return;
    const selectedSet = new Set(effectiveSelectedNodeIds);
    if (activeMarkdownBlock?.relatedNodeIds?.some((id) => selectedSet.has(id))) return;
    const matched = markdownBlocks.find((block) =>
      block.relatedNodeIds.some((id) => selectedSet.has(id))
    );
    if (!matched) return;
    setActiveMarkdownBlockId((previous) => (previous === matched.id ? previous : matched.id));
  }, [activeMarkdownBlock, effectiveSelectedNodeIds, markdownBlocks]);

  useEffect(() => {
    if (!activeMarkdownBlockId) return;
    const target = markdownBlockRefs.current.get(activeMarkdownBlockId);
    if (!target) return;
    target.scrollIntoView({ block: "nearest" });
  }, [activeMarkdownBlockId]);

  useEffect(() => {
    if (activeDoc !== "skill" || markdownViewMode !== "raw") return;
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    if (document.activeElement !== textarea) return;
    syncNodeSelectionFromRawEditor(textarea);
  }, [activeDoc, markdownViewMode, markdownBlocks, skillMarkdown]);

  const commitGraph = (updater) => {
    setGraph((previous) => {
      const baseline = cloneGraph(previous);
      const next = updater(cloneGraph(previous));
      if (!next) return previous;
      const constrained = Array.isArray(next.edges)
        ? { ...next, edges: enforceSingleOutgoingEdges(next.edges) }
        : next;
      setUndoStack((stack) => [...stack, baseline].slice(-80));
      return constrained;
    });
  };

  const undoGraph = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const snapshot = stack[stack.length - 1];
      setGraph(cloneGraph(snapshot));
      return stack.slice(0, -1);
    });
    setFolderToolArmed(false);
    setMarqueeRect(null);
    setMarqueeStart(null);
    setNodeMarqueeRect(null);
    setNodeMarqueeStart(null);
    setDragState(null);
    setConnectionDragState(null);
    setSelectedNodeIds([]);
  };

  const addNode = (type) => {
    const definition = NODE_LIBRARY[type] ?? NODE_LIBRARY.workflow;
    commitGraph((draft) => {
      const selected = draft.nodes.find((node) => node.id === draft.selectedNodeId);
      const anchor = selected ?? draft.nodes[0];
      const id = nodeId(type, draft.nodes.length + 1);
      const count = draft.nodes.filter((node) => node.type === type).length + 1;
      const newNode = {
        id,
        type,
        label: `${pick(definition.label, isZh)} ${count}`,
        x: selected ? selected.x + 220 : 90,
        y: selected ? selected.y + 120 : 96,
        params: normalizeNodeParams(definition.defaults(), definition)
      };
      const edges = [...draft.edges];
      if (anchor && anchor.id !== newNode.id) {
        edges.push({ id: edgeId(), from: anchor.id, to: newNode.id, kind: "default" });
      }
      return {
        ...draft,
        nodes: [...draft.nodes, newNode],
        edges,
        selectedNodeId: newNode.id,
        selectedFolderId: null
      };
    });
  };

  const applyPreset = (presetId) => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    commitGraph((draft) => {
      const selected = draft.nodes.find((node) => node.id === draft.selectedNodeId);
      const anchor = selected ?? draft.nodes[0];
      const baseX = selected ? selected.x + 240 : 160;
      const baseY = selected ? selected.y : 74 + (draft.nodes.length % 3) * 48;

      const keyMap = new Map();
      const newNodes = preset.nodes.map((template, index) => {
        const definition = NODE_LIBRARY[template.type] ?? NODE_LIBRARY.workflow;
        const id = nodeId(template.type, index);
        keyMap.set(template.key, id);
        const mergedParams = {
          ...definition.defaults(),
          ...(template.params ?? {})
        };
        return {
          id,
          type: template.type,
          label: pick(template.label, isZh),
          x: baseX + template.dx,
          y: baseY + template.dy,
          params: normalizeNodeParams(mergedParams, definition)
        };
      });

      const newEdges = preset.edges.map((edge) => ({
        id: edgeId(),
        from: keyMap.get(edge.from),
        to: keyMap.get(edge.to),
        kind: edge.kind
      }));

      const entry = keyMap.get(preset.entry);
      if (anchor && entry && anchor.id !== entry) {
        newEdges.unshift({ id: edgeId(), from: anchor.id, to: entry, kind: "default" });
      }

      return {
        ...draft,
        nodes: [...draft.nodes, ...newNodes],
        edges: [...draft.edges, ...newEdges],
        selectedNodeId: entry,
        selectedFolderId: null
      };
    });
  };

  const selectNodes = (ids, primaryId = null) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setSelectedNodeIds(uniqueIds);
    setGraph((previous) => ({
      ...previous,
      selectedNodeId: primaryId ?? uniqueIds[0] ?? null,
      selectedFolderId: null
    }));
  };

  const copySelectedNodes = () => {
    const ids = effectiveSelectedNodeIds.length
      ? effectiveSelectedNodeIds
      : selectedNode
        ? [selectedNode.id]
        : [];

    if (!ids.length) return false;

    const idSet = new Set(ids);
    const nodes = graph.nodes
      .filter((node) => idSet.has(node.id))
      .map((node) => ({
        ...node,
        params: cloneNodeParams(node.params, NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow)
      }));
    const edges = graph.edges
      .filter((edge) => idSet.has(edge.from) && idSet.has(edge.to))
      .map((edge) => ({ ...edge }));

    if (!nodes.length) return false;

    clipboardRef.current = { nodes, edges };
    return true;
  };

  const pasteSelectedNodes = () => {
    const payload = clipboardRef.current;
    if (!payload?.nodes?.length) return;

    let nextSelection = [];

    commitGraph((draft) => {
      const idMap = new Map();
      const pastedNodes = payload.nodes.map((node, index) => {
        const id = nodeId(node.type, index + 1);
        idMap.set(node.id, id);
        return {
          ...node,
          id,
          x: snapToGrid(node.x + 42),
          y: snapToGrid(node.y + 42),
          label: `${node.label} Copy`,
          params: cloneNodeParams(node.params, NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow)
        };
      });

      const pastedEdges = payload.edges
        .map((edge) => {
          const from = idMap.get(edge.from);
          const to = idMap.get(edge.to);
          if (!from || !to) return null;
          return { ...edge, id: edgeId(), from, to };
        })
        .filter(Boolean);

      nextSelection = pastedNodes.map((node) => node.id);

      return {
        ...draft,
        nodes: [...draft.nodes, ...pastedNodes],
        edges: [...draft.edges, ...pastedEdges],
        selectedNodeId: nextSelection[0] ?? draft.selectedNodeId,
        selectedFolderId: null
      };
    });

    if (nextSelection.length) {
      setSelectedNodeIds(nextSelection);
    }
  };

  const duplicateSelectedNode = () => {
    const copiedAny = copySelectedNodes();
    if (!copiedAny) return;
    pasteSelectedNodes();
  };

  const deleteSelectedNode = () => {
    const selectedIds = effectiveSelectedNodeIds.length
      ? effectiveSelectedNodeIds
      : selectedNode
        ? [selectedNode.id]
        : [];

    const deletable = selectedIds.filter((id) => graph.nodes.some((item) => item.id === id));

    if (!deletable.length) return;
    const deleteSet = new Set(deletable);

    commitGraph((draft) => {
      const nodes = draft.nodes.filter((node) => !deleteSet.has(node.id));
      const edges = draft.edges.filter((edge) => !deleteSet.has(edge.from) && !deleteSet.has(edge.to));
      const folders = draft.folders
        .map((folder) => ({ ...folder, nodeIds: folder.nodeIds.filter((nodeId) => !deleteSet.has(nodeId)) }))
        .filter((folder) => folder.nodeIds.length > 0);

      return {
        ...draft,
        nodes,
        edges,
        folders,
        selectedNodeId: nodes[0]?.id ?? null,
        selectedFolderId: null
      };
    });

    setSelectedNodeIds([]);
  };

  const connectSelectedNodes = () => {
    const ids = effectiveSelectedNodeIds.length
      ? effectiveSelectedNodeIds
      : selectedNode
        ? [selectedNode.id]
        : [];

    if (ids.length < 2) return;

    const ordered = [...ids]
      .map((id) => graph.nodes.find((node) => node.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

    commitGraph((draft) => {
      const edgeSet = new Set(draft.edges.map((edge) => `${edge.from}->${edge.to}`));
      const additions = [];

      for (let index = 0; index < ordered.length - 1; index += 1) {
        const from = ordered[index];
        const to = ordered[index + 1];
        const key = `${from.id}->${to.id}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        additions.push({ id: edgeId(), from: from.id, to: to.id, kind: "default" });
      }

      if (!additions.length) return draft;
      return { ...draft, edges: [...draft.edges, ...additions] };
    });
  };

  const nudgeSelectedNodes = (dx, dy) => {
    const ids = effectiveSelectedNodeIds.length
      ? effectiveSelectedNodeIds
      : selectedNode
        ? [selectedNode.id]
        : [];

    if (!ids.length) return;
    const idSet = new Set(ids);

    commitGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        idSet.has(node.id)
          ? { ...node, x: snapToGrid(node.x + dx), y: snapToGrid(node.y + dy) }
          : node
      )
    }));
  };

  const deleteSelectedFolder = () => {
    if (!selectedFolder) return;
    commitGraph((draft) => {
      const id = draft.selectedFolderId;
      const nodes = draft.nodes.map((node) => {
        if (node.params.folderId !== id) return node;
        const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
        const nextParams = { ...normalizeNodeParams(node.params, definition) };
        delete nextParams.folderId;
        return { ...node, params: normalizeNodeParams(nextParams, definition) };
      });

      return {
        ...draft,
        nodes,
        folders: draft.folders.filter((folder) => folder.id !== id),
        selectedFolderId: null
      };
    });
  };

  const autoLayoutNodes = () => {
    commitGraph((draft) => {
      const cols = 4;
      const nodes = draft.nodes.map((node, index) => ({
        ...node,
        x: 56 + (index % cols) * 244,
        y: 88 + Math.floor(index / cols) * 148
      }));

      const folders = draft.folders.map((folder) => {
        const members = nodes.filter((node) => folder.nodeIds.includes(node.id));
        if (!members.length) return folder;
        const left = Math.min(...members.map((node) => node.x));
        const top = Math.min(...members.map((node) => node.y));
        const right = Math.max(...members.map((node) => node.x + NODE_W));
        const bottom = Math.max(...members.map((node) => node.y + NODE_H));
        return { ...folder, x: left - 20, y: top - 20, width: right - left + 40, height: bottom - top + 40 };
      });

      return { ...draft, nodes, folders };
    });
  };

  const resetGraph = () => {
    setGraph(cloneGraph(INITIAL_GRAPH));
    setUndoStack([]);
    setFolderToolArmed(false);
    setMarqueeRect(null);
    setMarqueeStart(null);
    setNodeMarqueeRect(null);
    setNodeMarqueeStart(null);
    setDragState(null);
    setConnectionDragState(null);
    setSelectedNodeIds([]);
    clipboardRef.current = null;
  };

  useEffect(() => {
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    setSelectedNodeIds((previous) => previous.filter((id) => nodeIds.has(id)));
  }, [graph.nodes]);

  useEffect(() => {
    const isMarkdownEditorFocused = () => {
      const active = document.activeElement;
      if (!active) return false;
      if (active === markdownTextareaRef.current) return true;
      if (!(active instanceof HTMLElement)) return false;
      return Boolean(markdownPaneRef.current?.contains(active));
    };

    const onKeyDown = (event) => {
      if (isEditableElement(event.target) || isMarkdownEditorFocused()) return;

      const withMeta = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (withMeta && key === "z") {
        event.preventDefault();
        undoGraph();
        return;
      }

      if (withMeta && key === "c") {
        event.preventDefault();
        copySelectedNodes();
        return;
      }

      if (withMeta && key === "v") {
        event.preventDefault();
        pasteSelectedNodes();
        return;
      }

      if (withMeta && key === "d") {
        event.preventDefault();
        duplicateSelectedNode();
        return;
      }

      if (withMeta && key === "a") {
        event.preventDefault();
        const allIds = graph.nodes.map((node) => node.id);
        selectNodes(allIds, graph.selectedNodeId ?? allIds[0] ?? null);
        return;
      }

      if (withMeta && key === "l") {
        event.preventDefault();
        autoLayoutNodes();
        return;
      }

      if (withMeta && key === "k") {
        event.preventDefault();
        connectSelectedNodes();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedNode();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setConnectionDragState(null);
        setSelectedNodeIds([]);
        setGraph((previous) => ({
          ...previous,
          selectedNodeId: null,
          selectedFolderId: null
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelectedNodes(0, -DRAG_GRID);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelectedNodes(0, DRAG_GRID);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelectedNodes(-DRAG_GRID, 0);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelectedNodes(DRAG_GRID, 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [graph.nodes, graph.selectedNodeId, undoStack.length]);

  const updateSelectedNode = (patch) => {
    if (!selectedNode) return;
    commitGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => (node.id === draft.selectedNodeId ? { ...node, ...patch } : node))
    }));
  };

  const updateSelectedParam = (key, value) => {
    if (!selectedNode) return;
    commitGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id !== draft.selectedNodeId
          ? node
          : {
              ...node,
              params: normalizeNodeParams(
                { ...(node.params ?? {}), [key]: value },
                NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow
              )
            }
      )
    }));
  };

  const updateSelectedItems = (updater) => {
    if (!selectedNode) return;
    commitGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => {
        if (node.id !== draft.selectedNodeId) return node;
        const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
        const normalized = normalizeNodeParams(node.params, definition);
        const nextItems = updater(normalized.items.map((item) => ({ ...item })));
        return {
          ...node,
          params: normalizeNodeParams({ ...normalized, items: nextItems }, definition)
        };
      })
    }));
  };

  const addSelectedItem = () => {
    if (!selectedNode) return;
    updateSelectedItems((items) => [
      ...items,
      createNodeItem(
        {
          title: isZh ? `新条目 ${items.length + 1}` : `New Item ${items.length + 1}`,
          content: ""
        },
        items.length
      )
    ]);
  };

  const updateSelectedItem = (itemId, patch) => {
    if (!selectedNode) return;
    updateSelectedItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const updateSelectedTableShape = (itemId, nextRows, nextCols) => {
    if (!selectedNode) return;
    updateSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId || normalizeItemType(item.type) !== "table") return item;
        const payload = normalizeTableItemPayload(item);
        const rows = clampItemTableSize(nextRows, payload.tableRows);
        const cols = clampItemTableSize(nextCols, payload.tableCols);
        return {
          ...item,
          ...payload,
          tableRows: rows,
          tableCols: cols,
          tableData: normalizeTableDataShape(payload.tableData, rows, cols, payload.tableData)
        };
      })
    );
  };

  const updateSelectedTableCell = (itemId, rowIndex, colIndex, value) => {
    if (!selectedNode) return;
    updateSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId || normalizeItemType(item.type) !== "table") return item;
        const payload = normalizeTableItemPayload(item);
        const nextData = payload.tableData.map((row) => [...row]);
        if (!nextData[rowIndex]) {
          nextData[rowIndex] = Array.from({ length: payload.tableCols }, () => "");
        }
        nextData[rowIndex][colIndex] = value;
        return {
          ...item,
          ...payload,
          tableData: nextData
        };
      })
    );
  };

  const removeSelectedItem = (itemId) => {
    if (!selectedNode) return;
    updateSelectedItems((items) => items.filter((item) => item.id !== itemId));
  };

  const toggleSelectedItemApplied = (itemId) => {
    if (!selectedNode) return;
    updateSelectedItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, applied: item.applied === false }
          : item
      )
    );
  };

  const updateSelectedItemType = (itemId, nextType) => {
    if (!selectedNode) return;
    updateSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        const normalizedType = normalizeItemType(nextType);
        if (normalizedType === "code") {
          return {
            ...item,
            type: normalizedType,
            language: normalizeLang(item.language ?? item.lang ?? "text")
          };
        }
        if (normalizedType === "table") {
          return {
            ...item,
            type: normalizedType,
            ...normalizeTableItemPayload(item)
          };
        }
        return { ...item, type: normalizedType };
      })
    );
  };

  const updateSelectedFolder = (patch) => {
    if (!selectedFolder) return;
    commitGraph((draft) => ({
      ...draft,
      folders: draft.folders.map((folder) =>
        folder.id === draft.selectedFolderId ? { ...folder, ...patch } : folder
      )
    }));
  };

  const updateSkillMetadata = (key, value) => {
    commitGraph((draft) => ({
      ...draft,
      metadata: normalizeSkillMetadata({
        ...(draft.metadata ?? {}),
        [key]: value
      })
    }));
  };

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + canvas.scrollLeft,
      y: event.clientY - rect.top + canvas.scrollTop
    };
  };

  const getNodeIdAtCanvasPoint = (point, excludeNodeId = null) => {
    if (!point) return null;
    for (let index = graph.nodes.length - 1; index >= 0; index -= 1) {
      const node = graph.nodes[index];
      if (!node || node.id === excludeNodeId) continue;
      const inside =
        point.x >= node.x &&
        point.x <= node.x + NODE_W &&
        point.y >= node.y &&
        point.y <= node.y + NODE_H;
      if (inside) return node.id;
    }
    return null;
  };

  const encapsulateByRect = (rect) => {
    const normalized = normalizeRect(rect);
    if (!normalized) return;

    const ids = graph.nodes
      .filter((node) =>
        intersects(normalized, {
          x: node.x,
          y: node.y,
          width: NODE_W,
          height: NODE_H
        })
      )
      .map((node) => node.id);

    if (!ids.length) return;

    const idSet = new Set(ids);
    setSelectedNodeIds([]);

    commitGraph((draft) => {
      const members = draft.nodes.filter((node) => idSet.has(node.id));
      if (!members.length) return draft;

      const left = Math.min(...members.map((node) => node.x));
      const top = Math.min(...members.map((node) => node.y));
      const right = Math.max(...members.map((node) => node.x + NODE_W));
      const bottom = Math.max(...members.map((node) => node.y + NODE_H));

      const cleaned = draft.folders
        .map((folder) => ({
          ...folder,
          nodeIds: folder.nodeIds.filter((nodeId) => !idSet.has(nodeId))
        }))
        .filter((folder) => folder.nodeIds.length > 0);

      const folder = {
        id: folderId(),
        label: `${t("文件夹", "Folder", "workspacePage.folder.prefix")} ${cleaned.length + 1}`,
        tone: "cyan",
        x: left - 20,
        y: top - 20,
        width: right - left + 40,
        height: bottom - top + 40,
        nodeIds: ids
      };

      return {
        ...draft,
        nodes: draft.nodes.map((node) =>
          idSet.has(node.id)
            ? {
                ...node,
                params: normalizeNodeParams(
                  { ...(node.params ?? {}), folderId: folder.id },
                  NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow
                )
              }
            : node
        ),
        folders: [...cleaned, folder],
        selectedNodeId: null,
        selectedFolderId: folder.id
      };
    });
  };

  const onNodeClick = (event, nodeId) => {
    event.stopPropagation();
    if (suppressNodeClickRef.current) {
      suppressNodeClickRef.current = false;
      return;
    }
    const withMulti = event.shiftKey || event.metaKey || event.ctrlKey;

    if (withMulti) {
      setSelectedNodeIds((previous) => {
        const exists = previous.includes(nodeId);
        const next = exists ? previous.filter((id) => id !== nodeId) : [...previous, nodeId];
        if (!next.length) {
          setGraph((prev) => ({ ...prev, selectedNodeId: null, selectedFolderId: null }));
          return [];
        }
        setGraph((prev) => ({ ...prev, selectedNodeId: nodeId, selectedFolderId: null }));
        return next;
      });
      return;
    }

    selectNodes([nodeId], nodeId);
  };

  const onNodePortMouseDown = (event, nodeId, side) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) return;

    const direction = side === "left" ? "in" : "out";
    const startPoint = direction === "out"
      ? { x: node.x + NODE_W, y: node.y + NODE_H * 0.5 }
      : { x: node.x, y: node.y + NODE_H * 0.5 };

    setNodeMarqueeStart(null);
    setNodeMarqueeRect(null);
    setMarqueeStart(null);
    setMarqueeRect(null);
    setDragState(null);
    setConnectionDragState({
      nodeId,
      direction,
      currentPoint: startPoint,
      hoverNodeId: null
    });
  };

  const onNodeMouseDown = (event, nodeId) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setConnectionDragState(null);
    suppressNodeClickRef.current = false;
    didNodeDragMoveRef.current = false;

    const point = getCanvasPoint(event);
    const withMulti = event.shiftKey || event.metaKey || event.ctrlKey;
    const currentIds = withMulti
      ? (effectiveSelectedNodeIds.includes(nodeId)
          ? effectiveSelectedNodeIds
          : [...effectiveSelectedNodeIds, nodeId])
      : (effectiveSelectedNodeIds.includes(nodeId) ? effectiveSelectedNodeIds : [nodeId]);

    const moveSet = new Set(currentIds.length ? currentIds : [nodeId]);
    const startNodes = graph.nodes
      .filter((node) => moveSet.has(node.id))
      .map((node) => ({ id: node.id, x: node.x, y: node.y }));

    setUndoStack((stack) => [...stack, cloneGraph(graph)].slice(-80));
    setDragState({
      startPoint: point,
      nodes: startNodes
    });
  };

  const onCanvasDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".flow-node") || event.target.closest(".node-folder")) {
      return;
    }
    setConnectionDragState(null);

    const point = getCanvasPoint(event);

    if (folderToolArmed) {
      setMarqueeStart(point);
      setMarqueeRect({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      return;
    }

    setNodeMarqueeStart(point);
    setNodeMarqueeRect({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
    setGraph((previous) => ({ ...previous, selectedNodeId: null, selectedFolderId: null }));
    setSelectedNodeIds([]);
  };

  const onCanvasMove = (event) => {
    if (connectionDragState) {
      const point = getCanvasPoint(event);
      const hoverNodeId = getNodeIdAtCanvasPoint(point, connectionDragState.nodeId);
      setConnectionDragState((previous) => (
        previous
          ? {
              ...previous,
              currentPoint: point,
              hoverNodeId
            }
          : previous
      ));
      return;
    }

    if (dragState) {
      const point = getCanvasPoint(event);
      const dx = point.x - dragState.startPoint.x;
      const dy = point.y - dragState.startPoint.y;
      const deltaX = snapToGrid(dx);
      const deltaY = snapToGrid(dy);
      if (deltaX !== 0 || deltaY !== 0) {
        didNodeDragMoveRef.current = true;
      }
      const moveMap = new Map(dragState.nodes.map((item) => [item.id, item]));

      setGraph((previous) => ({
        ...previous,
        nodes: previous.nodes.map((node) => {
          const origin = moveMap.get(node.id);
          if (!origin) return node;
          return {
            ...node,
            x: snapToGrid(origin.x + deltaX),
            y: snapToGrid(origin.y + deltaY)
          };
        })
      }));
      return;
    }

    if (folderToolArmed && marqueeStart) {
      const point = getCanvasPoint(event);
      setMarqueeRect({ x1: marqueeStart.x, y1: marqueeStart.y, x2: point.x, y2: point.y });
      return;
    }

    if (nodeMarqueeStart) {
      const point = getCanvasPoint(event);
      setNodeMarqueeRect({ x1: nodeMarqueeStart.x, y1: nodeMarqueeStart.y, x2: point.x, y2: point.y });
    }
  };

  const onCanvasUp = (event) => {
    if (connectionDragState) {
      const point = getCanvasPoint(event);
      const sourceId = connectionDragState.nodeId;
      const targetId = getNodeIdAtCanvasPoint(point, sourceId);
      setConnectionDragState(null);

      if (!targetId || sourceId === targetId) return;

      const fromId = connectionDragState.direction === "out" ? sourceId : targetId;
      const toId = connectionDragState.direction === "out" ? targetId : sourceId;
      if (!fromId || !toId || fromId === toId) return;

      commitGraph((draft) => {
        const exists = draft.edges.some((edge) => edge.from === fromId && edge.to === toId);
        if (exists) return draft;
        return {
          ...draft,
          edges: [...draft.edges, { id: edgeId(), from: fromId, to: toId, kind: "default" }]
        };
      });
      return;
    }

    if (dragState) {
      suppressNodeClickRef.current = didNodeDragMoveRef.current;
      setDragState(null);
      return;
    }

    if (folderToolArmed && marqueeStart && marqueeRect) {
      const point = getCanvasPoint(event);
      const rect = { x1: marqueeStart.x, y1: marqueeStart.y, x2: point.x, y2: point.y };
      const normalized = normalizeRect(rect);
      if (normalized && normalized.right - normalized.left > 8 && normalized.bottom - normalized.top > 8) {
        encapsulateByRect(rect);
      }
      setMarqueeStart(null);
      setMarqueeRect(null);
      setFolderToolArmed(false);
      return;
    }

    if (nodeMarqueeStart && nodeMarqueeRect) {
      const normalized = normalizeRect(nodeMarqueeRect);
      if (normalized && normalized.right - normalized.left > 8 && normalized.bottom - normalized.top > 8) {
        const ids = graph.nodes
          .filter((node) =>
            intersects(normalized, {
              x: node.x,
              y: node.y,
              width: NODE_W,
              height: NODE_H
            })
          )
          .map((node) => node.id);
        if (ids.length) {
          selectNodes(ids, ids[0]);
        }
      }
      setNodeMarqueeStart(null);
      setNodeMarqueeRect(null);
    }
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const exportSkillfoMarkdown = () => {
    if (typeof window === "undefined") return;
    const blob = new Blob([generatedSkillfoMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SKILLFO.md";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleDocMapping = () => {
    setIsDocMappingLive((previous) => {
      const next = !previous;
      if (next) {
        setSkillMarkdown(generatedSkillMarkdown);
      }
      return next;
    });
  };

  const refreshSkillMarkdown = () => {
    if (activeDoc !== "skill") return;
    setSkillMarkdown(generatedSkillMarkdown);
  };

  const toggleLibraryGroup = (key) => {
    setLibraryGroupOpen((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const setMarkdownBlockRef = (blockId, element) => {
    setMarkdownBlockRefInEditor(markdownBlockRefs, blockId, element);
  };

  const onActivateMarkdownBlock = (block) => {
    activateMarkdownBlock({
      block,
      setActiveMarkdownBlockId,
      selectNodes
    });
  };

  const focusMarkdownBlockByIndex = (index) => {
    focusMarkdownBlockByIndexInEditor({
      index,
      markdownBlocks,
      onActivateMarkdownBlock,
      markdownBlockRefs
    });
  };

  const onMarkdownBlockKeyDown = (event, blockIndex) => {
    handleMarkdownBlockKeyDownInEditor({
      event,
      blockIndex,
      markdownBlocks,
      focusMarkdownBlockByIndex
    });
  };

  const syncNodeSelectionFromRawEditor = (textarea) => {
    syncNodeSelectionFromRawEditorInEditor({
      textarea,
      activeDoc,
      markdownViewMode,
      markdownBlocks,
      activeMarkdownBlockId,
      setActiveMarkdownBlockId,
      effectiveSelectedNodeIds,
      selectedNodeIdSet,
      selectNodes
    });
  };

  const onRawEditorKeyDown = (event) => {
    handleRawEditorKeyDownInEditor({
      event,
      activeDoc,
      vimSubMode,
      setVimSubMode,
      setSkillMarkdown,
      syncNodeSelectionFromRawEditor,
      markdownTextareaRef
    });
  };

  const applyRenderedBlockEdit = (blockId, nextText) => {
    applyRenderedBlockEditInEditor({
      blockId,
      nextText,
      markdownBlockMap,
      skillMarkdown,
      isDocMappingLive,
      setIsDocMappingLive,
      setSkillMarkdown
    });
  };

  const selectedDefinition = selectedNode ? NODE_LIBRARY[selectedNode.type] ?? NODE_LIBRARY.workflow : null;
  const selectedNodeParams = selectedNode
    ? normalizeNodeParams(selectedNode.params, selectedDefinition ?? NODE_LIBRARY.workflow)
    : null;
  const selectedNodeItems = selectedNodeParams?.items ?? [];
  const skillMetadata = normalizeSkillMetadata(graph.metadata);
  const marquee = normalizeRect(marqueeRect);
  const nodeMarquee = normalizeRect(nodeMarqueeRect);
  const relatedMarkdownNodeIdSet = activeMarkdownNodeIdSet;

  return (
    <article className="workspace-app">
      <header className="workspace-toolbar">
        <div className="workspace-toolbar-left">
          <p className="workspace-toolbar-title">{t("工作区工具栏", "Workspace Toolbar", "workspacePage.toolbar.title")}</p>
          <div className="workspace-view-icons" role="group" aria-label={t("视图", "View", "workspacePage.toolbar.view")}> 
            <button
              type="button"
              className={`workspace-icon-btn${viewMode === "left" ? " is-active" : ""}`}
              onClick={() => setViewMode("left")}
              title={t("左侧", "Left", "workspacePage.toolbar.left")}
            >
              <span className="split-icon split-icon-left" />
            </button>
            <button
              type="button"
              className={`workspace-icon-btn${viewMode === "split" ? " is-active" : ""}`}
              onClick={() => setViewMode("split")}
              title={t("分屏", "Split", "workspacePage.toolbar.split")}
            >
              <span className="split-icon split-icon-both" />
            </button>
            <button
              type="button"
              className={`workspace-icon-btn${viewMode === "right" ? " is-active" : ""}`}
              onClick={() => setViewMode("right")}
              title={t("右侧", "Right", "workspacePage.toolbar.right")}
            >
              <span className="split-icon split-icon-right" />
            </button>
          </div>
        </div>

        <div className="workspace-toolbar-right">
          <button
            type="button"
            className="workspace-icon-btn"
            disabled={undoStack.length === 0}
            onClick={undoGraph}
            title={undoStack.length === 0
              ? t("无可撤销", "No history", "workspacePage.toolbar.noHistory")
              : t("撤销", "Undo", "workspacePage.toolbar.undo")}
          >
            <span className="toolbar-icon-undo">?</span>
          </button>
          <span className="workspace-pill">{t("视图", "View", "workspacePage.toolbar.view")}:{viewMode.toUpperCase()}</span>
          <span className="workspace-pill">{t("选中", "Selected", "workspacePage.toolbar.selected")}:{effectiveSelectedNodeIds.length}</span>
          <button
            type="button"
            className={`workspace-pill workspace-pill-btn${activeDoc === "skill" ? " is-active" : ""}`}
            onClick={() => setActiveDoc("skill")}
          >
            SKILL.md
          </button>
          <button
            type="button"
            className={`workspace-pill workspace-pill-btn${activeDoc === "skillfo" ? " is-active" : ""}`}
            onClick={() => setActiveDoc("skillfo")}
          >
            SKILLFO.md
          </button>
          <button
            type="button"
            className="workspace-pill workspace-pill-btn"
            onClick={exportSkillfoMarkdown}
          >
            {t("导出 SKILLFO.md", "Export SKILLFO.md", "workspacePage.toolbar.exportSkillfo")}
          </button>
          <span className="workspace-pill">{activeDocumentName}</span>
          <button
            type="button"
            className={`workspace-pill workspace-pill-btn${isDocMappingLive ? " is-active" : ""}`}
            onClick={toggleDocMapping}
            disabled={activeDoc !== "skill"}
            title={t("实时映射状态", "Live mapping status", "workspacePage.toolbar.liveMappingTitle")}
          >
            {isDocMappingLive
              ? t("实时映射: 开", "Live Mapping: ON", "workspacePage.toolbar.liveMappingOn")
              : t("实时映射: 关", "Live Mapping: OFF", "workspacePage.toolbar.liveMappingOff")}
          </button>
        </div>
      </header>

      <section className={`workspace-layout is-${viewMode}`}>
        {viewMode !== "right" && (
          <section className="workspace-pane node-pane">
            <div className="pane-head">
              <h2>{t("可视化技能编排", "Visual Skill Orchestrator", "workspacePage.canvas.title")}</h2>
              <p>{t("通过节点编排组织技能文档，实时生成结构化 SKILL.md", "Compose skill documentation with nodes and generate structured SKILL.md in real time", "workspacePage.canvas.docComposerCopy")}</p>
            </div>

            <div className="node-toolbar">
              <button
                type="button"
                className="node-tool-btn"
                onClick={copySelectedNodes}
                disabled={effectiveSelectedNodeIds.length === 0 && !selectedNode}
              >
                {t("复制", "Copy", "workspacePage.actions.copy")}
              </button>
              <button
                type="button"
                className="node-tool-btn"
                onClick={pasteSelectedNodes}
                disabled={!clipboardRef.current?.nodes?.length}
              >
                {t("粘贴", "Paste", "workspacePage.actions.paste")}
              </button>
              <button
                type="button"
                className="node-tool-btn"
                onClick={duplicateSelectedNode}
                disabled={effectiveSelectedNodeIds.length === 0 && !selectedNode}
              >
                {t("复制节点", "Duplicate", "workspacePage.actions.duplicate")}
              </button>
              <button
                type="button"
                className="node-tool-btn"
                onClick={connectSelectedNodes}
                disabled={effectiveSelectedNodeIds.length < 2}
              >
                {t("连接所选", "Connect Selected", "workspacePage.actions.connectSelected")}
              </button>
              <button
                type="button"
                className="node-tool-btn danger"
                onClick={deleteSelectedNode}
                disabled={effectiveSelectedNodeIds.length === 0 && !selectedNode}
              >
                {t("删除节点", "Delete Node", "workspacePage.actions.deleteNode")}
              </button>
              <button type="button" className="node-tool-btn" onClick={autoLayoutNodes}>{t("自动布局", "Auto Layout", "workspacePage.actions.autoLayout")}</button>
              <button
                type="button"
                className={`node-tool-btn${folderToolArmed ? " is-armed" : ""}`}
                onClick={() => {
                  setFolderToolArmed((prev) => !prev);
                  setMarqueeRect(null);
                  setMarqueeStart(null);
                }}
              >
                {folderToolArmed
                  ? t("框选中", "Selecting", "workspacePage.actions.selecting")
                  : t("文件夹框选", "Folder Select", "workspacePage.actions.folderSelect")}
              </button>
              <button type="button" className="node-tool-btn" onClick={deleteSelectedFolder} disabled={!selectedFolder}>{t("解散文件夹", "Unpack Folder", "workspacePage.actions.unpackFolder")}</button>
              <button type="button" className="node-tool-btn" onClick={resetGraph}>{t("重置", "Reset", "workspacePage.actions.reset")}</button>
              <span className="workspace-shortcut-hint">
                {t("快捷键: Ctrl/Cmd+C V D K Z / Delete / 方向键微调", "Hotkeys: Ctrl/Cmd+C V D K Z / Delete / Arrows", "workspacePage.actions.hotkeys")}
              </span>
            </div>

            <div className="metadata-topbar-anchor">
              <section className={`metadata-topbar${isMetadataCollapsed ? " is-collapsed" : ""}`}>
                <button
                  type="button"
                  className="metadata-topbar-toggle"
                  onClick={() => setIsMetadataCollapsed((previous) => !previous)}
                >
                  <span className="metadata-topbar-arrow">{isMetadataCollapsed ? ">" : "v"}</span>
                  <span>{t("元数据", "Metadata", "workspacePage.properties.metadataTopbar")}</span>
                </button>
                {!isMetadataCollapsed && (
                  <div className="metadata-topbar-form">
                    <label>
                      <span>{t("技能名称", "Skill Name", "workspacePage.properties.skillName")}</span>
                      <input
                        type="text"
                        value={skillMetadata.skillName}
                        onChange={(event) => updateSkillMetadata("skillName", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>{t("描述", "Description", "workspacePage.properties.skillDescription")}</span>
                      <textarea
                        value={skillMetadata.description}
                        onChange={(event) => updateSkillMetadata("description", event.target.value)}
                      />
                    </label>
                  </div>
                )}
              </section>
            </div>

            <div className={`node-canvas-wrap${isLeftSidebarCollapsed ? " is-left-collapsed" : ""}`}>
              <aside className={`node-preset-sidebar${isLeftSidebarCollapsed ? " is-collapsed" : ""}`}>
                <button
                  type="button"
                  className="node-preset-collapse-btn"
                  onClick={() => setIsLeftSidebarCollapsed((previous) => !previous)}
                >
                  <span className="node-preset-collapse-arrow">{isLeftSidebarCollapsed ? ">" : "<"}</span>
                  <span>{t("节点", "Nodes", "workspacePage.sidebar.nodesShort")}</span>
                </button>

                {!isLeftSidebarCollapsed && (
                  <>
                    <div className="node-left-tabs" role="tablist" aria-label={t("左侧标签", "Left sidebar tabs", "workspacePage.sidebar.leftTabs")}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={leftSidebarTab === "library"}
                        className={`node-left-tab${leftSidebarTab === "library" ? " is-active" : ""}`}
                        onClick={() => setLeftSidebarTab("library")}
                      >
                        {t("节点库", "Node Library", "workspacePage.sidebar.nodeLibrary")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={leftSidebarTab === "templates"}
                        className={`node-left-tab${leftSidebarTab === "templates" ? " is-active" : ""}`}
                        onClick={() => setLeftSidebarTab("templates")}
                      >
                        {t("节点模板", "Node Templates", "workspacePage.sidebar.nodeTemplates")}
                      </button>
                    </div>

                    {leftSidebarTab === "library" ? (
                      <div className="node-library-panel">
                    <input
                      type="search"
                      className="node-library-search"
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                      placeholder={t("搜索节点库...", "Search node library...", "workspacePage.library.searchPlaceholder")}
                    />

                    <section className="node-library-group">
                      <button
                        type="button"
                        className="node-library-group-toggle"
                        onClick={() => toggleLibraryGroup("builtin")}
                      >
                        <span>{libraryGroupOpen.builtin ? "v" : ">"}</span>
                        <span>{t("内置节点", "Built-in Nodes", "workspacePage.library.groups.builtin")}</span>
                        <span className="group-count">{builtinNodes.length}</span>
                      </button>
                      {libraryGroupOpen.builtin && (
                        <ul className="node-library-list">
                          {builtinNodes.map((item) => (
                            <li key={item.id} className="node-library-item">
                              <div>
                                <h4>{item.title}</h4>
                                <p>{item.chip} · {item.type}</p>
                              </div>
                              <button
                                type="button"
                                className="library-apply-btn"
                                onClick={() => addNode(item.type)}
                              >
                                {t("添加", "Add", "workspacePage.library.add")}
                              </button>
                            </li>
                          ))}
                          {builtinNodes.length === 0 && (
                            <li className="node-library-empty">{t("无匹配结果", "No matches", "workspacePage.library.noMatches")}</li>
                          )}
                        </ul>
                      )}
                    </section>

                    <section className="node-library-group">
                      <button
                        type="button"
                        className="node-library-group-toggle"
                        onClick={() => toggleLibraryGroup("imported")}
                      >
                        <span>{libraryGroupOpen.imported ? "v" : ">"}</span>
                        <span>{t("用户导入", "User Imported", "workspacePage.library.groups.imported")}</span>
                        <span className="group-count">{filteredImportedNodePacks.length}</span>
                      </button>
                      {libraryGroupOpen.imported && (
                        <ul className="node-library-list">
                          {filteredImportedNodePacks.map((item) => (
                            <li key={item.id} className="node-library-item">
                              <div>
                                <h4>{item.title}</h4>
                                <p>{t("节点", "Nodes", "workspacePage.library.nodes")}: {item.nodeCount}</p>
                              </div>
                            </li>
                          ))}
                          {filteredImportedNodePacks.length === 0 && (
                            <li className="node-library-empty">{t("暂无导入节点包", "No imported node packs", "workspacePage.library.noImportedPacks")}</li>
                          )}
                        </ul>
                      )}
                    </section>

                    <section className="node-library-group">
                      <button
                        type="button"
                        className="node-library-group-toggle"
                        onClick={() => toggleLibraryGroup("downloaded")}
                      >
                        <span>{libraryGroupOpen.downloaded ? "v" : ">"}</span>
                        <span>{t("工坊下载", "Downloaded from Forge", "workspacePage.library.groups.downloaded")}</span>
                        <span className="group-count">
                          {downloadedNodePacksLoading ? "..." : filteredDownloadedNodePacks.length}
                        </span>
                      </button>
                      {libraryGroupOpen.downloaded && (
                        <ul className="node-library-list">
                          {downloadedNodePacksLoading && (
                            <li className="node-library-empty">{t("加载中...", "Loading...", "workspacePage.library.loading")}</li>
                          )}
                          {!downloadedNodePacksLoading && downloadedNodePacksError && (
                            <li className="node-library-empty is-error">{downloadedNodePacksError}</li>
                          )}
                          {!downloadedNodePacksLoading &&
                            !downloadedNodePacksError &&
                            filteredDownloadedNodePacks.map((item) => (
                              <li key={item.id} className="node-library-item">
                                <div>
                                  <h4>{item.title}</h4>
                                  <p>{t("节点", "Nodes", "workspacePage.library.nodes")}: {item.nodeCount} · {t("下载", "Downloads", "workspacePage.library.downloads")}: {item.downloads}</p>
                                </div>
                              </li>
                            ))}
                          {!downloadedNodePacksLoading &&
                            !downloadedNodePacksError &&
                            filteredDownloadedNodePacks.length === 0 && (
                              <li className="node-library-empty">{t("暂无下载节点包", "No downloaded node packs", "workspacePage.library.noDownloadedPacks")}</li>
                            )}
                        </ul>
                      )}
                    </section>
                      </div>
                    ) : (
                      <>
                        <h3>{t("节点模板", "Node Templates", "workspacePage.sidebar.nodeTemplates")}</h3>
                        <p>{t("选择预设模板并应用到画布", "Pick preset templates and apply to canvas", "workspacePage.templates.copy")}</p>
                        <ul className="node-preset-list">
                          {PRESETS.map((preset) => (
                            <li className="preset-card" key={preset.id}>
                              <h4>{pick(preset.title, isZh)}</h4>
                              <p>{pick(preset.desc, isZh)}</p>
                              <button type="button" className="preset-apply-btn" onClick={() => applyPreset(preset.id)}>
                                {t("应用", "Apply", "workspacePage.templates.apply")}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <p className="preset-marquee-hint">{t("拖拽空白区域可框选并封装到文件夹", "Drag blank canvas to encapsulate nodes into folder", "workspacePage.templates.hint")}</p>
                      </>
                    )}
                  </>
                )}
              </aside>

              <div className="node-stage">
                <div
                  className={`node-canvas${folderToolArmed ? " is-folder-armed" : ""}${dragState ? " is-dragging" : ""}${connectionDragState ? " is-connecting" : ""}`}
                  ref={canvasRef}
                  onMouseDown={onCanvasDown}
                  onMouseMove={onCanvasMove}
                  onMouseUp={onCanvasUp}
                  onMouseLeave={onCanvasUp}
                >
                  {graph.folders.map((folder) => (
                    <article
                      className={`node-folder tone-${folder.tone}${graph.selectedFolderId === folder.id ? " is-selected" : ""}`}
                      key={folder.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedNodeIds([]);
                        setGraph((previous) => ({ ...previous, selectedNodeId: null, selectedFolderId: folder.id }));
                      }}
                      style={{
                        left: `${folder.x}px`,
                        top: `${folder.y}px`,
                        width: `${folder.width}px`,
                        height: `${folder.height}px`
                      }}
                    >
                      <span className="node-folder-label">{folder.label} ({folder.nodeIds.length})</span>
                    </article>
                  ))}

                  <svg className="node-links" viewBox="0 0 1240 680" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <marker id="node-arrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                        <polygon points="0 0, 12 4, 0 8" />
                      </marker>
                    </defs>
                    {edgePaths.map((edge) => (
                      <g key={edge.id}>
                        <path className={`node-link node-link-${edge.kind}`} d={edge.d} />
                        <text x={edge.lx} y={edge.ly} className="node-link-label">{EDGE_LABEL[edge.kind] ?? edge.kind}</text>
                      </g>
                    ))}
                    {connectionPreviewPath && (
                      <g>
                        <path className="node-link node-link-draft" d={connectionPreviewPath.d} />
                      </g>
                    )}
                  </svg>

                  {graph.nodes.map((node) => {
                    const definition = NODE_LIBRARY[node.type] ?? NODE_LIBRARY.workflow;
                    const params = normalizeNodeParams(node.params, definition);
                    const appliedItems = params.items.filter((item) => item.applied !== false).length;
                    const isNodeSelected = effectiveSelectedNodeIds.includes(node.id);
                    const isNodeDocLinked = relatedMarkdownNodeIdSet.has(node.id);
                    const isConnectionTarget = connectionDragState?.hoverNodeId === node.id;
                    const isLeftPortActive =
                      connectionDragState?.nodeId === node.id && connectionDragState.direction === "in";
                    const isRightPortActive =
                      connectionDragState?.nodeId === node.id && connectionDragState.direction === "out";
                    return (
                      <article
                        className={`flow-node${isNodeSelected ? " is-selected" : ""}${isNodeDocLinked ? " is-doc-linked" : ""}${isConnectionTarget ? " is-connect-target" : ""}`}
                        key={node.id}
                        onClick={(event) => onNodeClick(event, node.id)}
                        onMouseDown={(event) => onNodeMouseDown(event, node.id)}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          "--node-color": sanitizeNodeColor(params.color, definition.color ?? DEFAULT_NODE_COLOR)
                        }}
                      >
                        <span className="flow-node-chip">{definition.chip}</span>
                        <h3>{node.label}</h3>
                        <p>{pick(definition.title, isZh)} · {appliedItems}/{params.items.length}</p>
                        <span
                          className={`flow-node-port${isLeftPortActive ? " is-active" : ""}`}
                          onMouseDown={(event) => onNodePortMouseDown(event, node.id, "left")}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span
                          className={`flow-node-port is-right${isRightPortActive ? " is-active" : ""}`}
                          onMouseDown={(event) => onNodePortMouseDown(event, node.id, "right")}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </article>
                    );
                  })}

                  {marquee && folderToolArmed && (
                    <div
                      className="folder-marquee"
                      style={{
                        left: `${marquee.left}px`,
                        top: `${marquee.top}px`,
                        width: `${marquee.right - marquee.left}px`,
                        height: `${marquee.bottom - marquee.top}px`
                      }}
                    />
                  )}

                  {!folderToolArmed && nodeMarquee && (
                    <div
                      className="node-select-marquee"
                      style={{
                        left: `${nodeMarquee.left}px`,
                        top: `${nodeMarquee.top}px`,
                        width: `${nodeMarquee.right - nodeMarquee.left}px`,
                        height: `${nodeMarquee.bottom - nodeMarquee.top}px`
                      }}
                    />
                  )}
                </div>

                <aside className={`node-sidebar${(selectedNode || selectedFolder) && !dragState ? " is-open" : ""}`}>
                  <header className="node-sidebar-head">
                    <h3>
                      {selectedNode
                        ? t("节点属性", "Node Properties", "workspacePage.properties.node")
                        : selectedFolder
                          ? t("文件夹属性", "Folder Properties", "workspacePage.properties.folder")
                          : t("节点属性", "Node Properties", "workspacePage.properties.node")}
                    </h3>
                    <button
                      type="button"
                      className="node-sidebar-close"
                      onClick={() => {
                        setSelectedNodeIds([]);
                        setGraph((previous) => ({
                          ...previous,
                          selectedNodeId: null,
                          selectedFolderId: null
                        }));
                      }}
                    >
                      ×
                    </button>
                  </header>

                  {selectedNode ? (
                    <div className="node-sidebar-form">
                      <label>
                        <span>{t("节点名称", "Node Name", "workspacePage.properties.nodeName")}</span>
                        <input
                          type="text"
                          value={selectedNode.label}
                          onChange={(event) => updateSelectedNode({ label: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{t("节点类型", "Node Type", "workspacePage.properties.nodeType")}</span>
                        <input
                          type="text"
                          readOnly
                          value={`${pick(selectedDefinition?.title ?? selectedNode.type, isZh)} (${selectedNode.type})`}
                          title={t(
                            "节点类型由节点模板定义，属性栏已弃用类型切换",
                            "Node type is defined by node template; type switching is deprecated in properties panel",
                            "workspacePage.properties.nodeTypeDeprecatedHint"
                          )}
                        />
                      </label>
                      <label>
                        <span>{t("节点颜色", "Node Color", "workspacePage.properties.nodeColor")}</span>
                        <div className="node-color-row">
                          <input
                            type="color"
                            value={sanitizeNodeColor(
                              selectedNodeParams?.color,
                              selectedDefinition?.color ?? DEFAULT_NODE_COLOR
                            )}
                            onChange={(event) => updateSelectedParam("color", event.target.value)}
                          />
                          <input
                            type="text"
                            value={sanitizeNodeColor(
                              selectedNodeParams?.color,
                              selectedDefinition?.color ?? DEFAULT_NODE_COLOR
                            )}
                            onChange={(event) =>
                              updateSelectedParam(
                                "color",
                                sanitizeNodeColor(
                                  event.target.value,
                                  selectedDefinition?.color ?? DEFAULT_NODE_COLOR
                                )
                              )
                            }
                          />
                        </div>
                      </label>
                      <label>
                        <span>{t("通用说明", "Generic Summary", "workspacePage.properties.genericSummary")}</span>
                        <textarea
                          value={selectedNodeParams?.summary ?? ""}
                          onChange={(event) => updateSelectedParam("summary", event.target.value)}
                        />
                      </label>
                      <div className="node-position-grid">
                        <label>
                          <span>{t("X", "X", "workspacePage.properties.positionX")}</span>
                          <input
                            type="number"
                            value={num(selectedNode.x)}
                            onChange={(event) => updateSelectedNode({ x: num(event.target.value, 0) })}
                          />
                        </label>
                        <label>
                          <span>{t("Y", "Y", "workspacePage.properties.positionY")}</span>
                          <input
                            type="number"
                            value={num(selectedNode.y)}
                            onChange={(event) => updateSelectedNode({ y: num(event.target.value, 0) })}
                          />
                        </label>
                      </div>

                      <section className="node-items-section">
                        <div className="node-items-header">
                          <p>{t("模块条目", "Module Items", "workspacePage.properties.moduleItems")}</p>
                          <button type="button" className="node-item-add-btn" onClick={addSelectedItem}>
                            {t("新建条目", "Add Item", "workspacePage.properties.addItem")}
                          </button>
                        </div>

                        <div className="node-items-list">
                          {selectedNodeItems.map((item, index) => {
                            const itemType = normalizeItemType(item.type);
                            const tableModel = itemType === "table" ? normalizeTableItemPayload(item) : null;
                            const codeLanguage = normalizeLang(item.language ?? item.lang ?? "text");

                            return (
                              <article
                                className={`node-item-card${item.applied !== false ? " is-applied" : ""}`}
                                key={item.id}
                              >
                                <div className="node-item-main">
                                  <label>
                                    <span>
                                      {t("条目名称", "Item Name", "workspacePage.properties.itemName")} {index + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(event) => updateSelectedItem(item.id, { title: event.target.value })}
                                    />
                                  </label>

                                  {itemType === "code" ? (
                                    <>
                                      <label>
                                        <span>{t("代码语言", "Code Language", "workspacePage.properties.itemCodeLanguage")}</span>
                                        <select
                                          value={codeLanguage}
                                          onChange={(event) =>
                                            updateSelectedItem(item.id, { language: normalizeLang(event.target.value) })
                                          }
                                        >
                                          {CODE_LANGUAGE_OPTIONS.map((lang) => (
                                            <option key={lang} value={lang}>{lang}</option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        <span>{t("代码内容", "Code", "workspacePage.properties.itemCodeContent")}</span>
                                        <textarea
                                          className="node-item-code-input"
                                          value={item.content}
                                          onChange={(event) =>
                                            updateSelectedItem(item.id, { content: event.target.value })
                                          }
                                        />
                                      </label>
                                    </>
                                  ) : itemType === "table" && tableModel ? (
                                    <>
                                      <div className="node-item-table-meta">
                                        <label>
                                          <span>{t("行数", "Rows", "workspacePage.properties.itemTableRows")}</span>
                                          <input
                                            type="number"
                                            min={TABLE_SIZE_MIN}
                                            max={TABLE_SIZE_MAX}
                                            value={tableModel.tableRows}
                                            onChange={(event) =>
                                              updateSelectedTableShape(
                                                item.id,
                                                num(event.target.value, tableModel.tableRows),
                                                tableModel.tableCols
                                              )
                                            }
                                          />
                                        </label>
                                        <label>
                                          <span>{t("列数", "Columns", "workspacePage.properties.itemTableCols")}</span>
                                          <input
                                            type="number"
                                            min={TABLE_SIZE_MIN}
                                            max={TABLE_SIZE_MAX}
                                            value={tableModel.tableCols}
                                            onChange={(event) =>
                                              updateSelectedTableShape(
                                                item.id,
                                                tableModel.tableRows,
                                                num(event.target.value, tableModel.tableCols)
                                              )
                                            }
                                          />
                                        </label>
                                      </div>
                                      <div className="node-item-table-grid-wrap">
                                        <table className="node-item-table-grid">
                                          <tbody>
                                            {tableModel.tableData.map((row, rowIndex) => (
                                              <tr key={`${item.id}-row-${rowIndex}`}>
                                                {row.map((cell, colIndex) => (
                                                  <td key={`${item.id}-cell-${rowIndex}-${colIndex}`}>
                                                    <input
                                                      type="text"
                                                      value={cell}
                                                      placeholder={
                                                        rowIndex === 0
                                                          ? t("列名", "Column", "workspacePage.properties.itemTableHeaderPlaceholder")
                                                          : t("值", "Value", "workspacePage.properties.itemTableValuePlaceholder")
                                                      }
                                                      onChange={(event) =>
                                                        updateSelectedTableCell(item.id, rowIndex, colIndex, event.target.value)
                                                      }
                                                    />
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  ) : (
                                    <label>
                                      <span>{t("条目内容", "Item Content", "workspacePage.properties.itemContent")}</span>
                                      <textarea
                                        value={item.content}
                                        onChange={(event) =>
                                          updateSelectedItem(item.id, { content: event.target.value })
                                        }
                                      />
                                    </label>
                                  )}
                                </div>
                                <div className="node-item-side-actions">
                                  <button
                                    type="button"
                                    className={`node-item-side-btn${item.applied !== false ? " is-active" : ""}`}
                                    onClick={() => toggleSelectedItemApplied(item.id)}
                                  >
                                    {item.applied !== false
                                      ? t("已应用", "Applied", "workspacePage.properties.itemApplied")
                                      : t("应用", "Apply", "workspacePage.properties.itemApply")}
                                  </button>
                                  <label className="node-item-type-wrap">
                                    <span>{t("类型", "Type", "workspacePage.properties.itemType")}</span>
                                    <select
                                      className="node-item-type-select"
                                      value={itemType}
                                      onChange={(event) => updateSelectedItemType(item.id, event.target.value)}
                                    >
                                      <option value="list">{t("列表", "List", "workspacePage.properties.itemTypeList")}</option>
                                      <option value="code">{t("代码块", "Code Block", "workspacePage.properties.itemTypeCode")}</option>
                                      <option value="table">{t("表格", "Table", "workspacePage.properties.itemTypeTable")}</option>
                                    </select>
                                  </label>
                                  <button
                                    type="button"
                                    className="node-item-side-btn danger"
                                    onClick={() => removeSelectedItem(item.id)}
                                  >
                                    {t("删除", "Delete", "workspacePage.properties.itemDelete")}
                                  </button>
                                </div>
                              </article>
                            );
                          })}

                          {selectedNodeItems.length === 0 && (
                            <p className="node-sidebar-empty node-sidebar-empty-inline">
                              {t("暂无条目，点击上方按钮新建", "No items yet. Create one above.", "workspacePage.properties.noItems")}
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : selectedFolder ? (
                    <div className="node-sidebar-form">
                      <label>
                        <span>{t("文件夹名称", "Folder Name", "workspacePage.properties.folderName")}</span>
                        <input
                          type="text"
                          value={selectedFolder.label}
                          onChange={(event) => updateSelectedFolder({ label: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{t("风格", "Tone", "workspacePage.properties.tone")}</span>
                        <select
                          value={selectedFolder.tone}
                          onChange={(event) => updateSelectedFolder({ tone: event.target.value })}
                        >
                          <option value="cyan">{t("冷蓝", "Cyan", "workspacePage.properties.tones.cyan")}</option>
                          <option value="amber">{t("琥珀", "Amber", "workspacePage.properties.tones.amber")}</option>
                          <option value="green">{t("青绿", "Green", "workspacePage.properties.tones.green")}</option>
                          <option value="pink">{t("洋红", "Pink", "workspacePage.properties.tones.pink")}</option>
                        </select>
                      </label>
                      <label>
                        <span>{t("节点数", "Nodes", "workspacePage.properties.nodeCount")}</span>
                        <input readOnly type="text" value={String(selectedFolder.nodeIds.length)} />
                      </label>
                    </div>
                  ) : (
                    <p className="node-sidebar-empty">{t("未选中节点或文件夹", "No node or folder selected", "workspacePage.properties.empty")}</p>
                  )}
                </aside>
              </div>
            </div>

          </section>
        )}

        {viewMode !== "left" && (
          <section className="workspace-pane vim-pane">
            <div className="pane-head">
              <h2>{t("SKILL.md 生成预览", "SKILL.md Live Preview", "workspacePage.preview.title")}</h2>
              <p>{t("节点变更会实时反映到右侧结构化文档", "Any node change updates the structured document in real time", "workspacePage.preview.copy")}</p>
            </div>

            <div className="vim-shell skill-preview-shell">
              <div className="vim-commandline skill-preview-top">
                <span>{`skill@composer:~/${activeDocumentName}`}</span>
                <div
                  className="skill-preview-actions"
                  role="group"
                  aria-label={t("渲染模式", "Render mode", "workspacePage.preview.modeGroup")}
                >
                  <button
                    type="button"
                    className={`skill-copy-btn${markdownViewMode === "raw" ? " is-active" : ""}`}
                    onClick={() => setMarkdownViewMode("raw")}
                  >
                    {t("原始", "Raw", "workspacePage.preview.modeRaw")}
                  </button>
                  <button
                    type="button"
                    className={`skill-copy-btn${markdownViewMode === "rendered" ? " is-active" : ""}`}
                    onClick={() => setMarkdownViewMode("rendered")}
                  >
                    {t("渲染", "Rendered", "workspacePage.preview.modeRendered")}
                  </button>
                  <button
                    type="button"
                    className={`skill-copy-btn${isModuleColorMappingOn ? " is-active" : ""}`}
                    onClick={() => setIsModuleColorMappingOn((previous) => !previous)}
                  >
                    {isModuleColorMappingOn
                      ? t("颜色映射: 开", "Color Map: ON", "workspacePage.preview.colorMapOn")
                      : t("颜色映射: 关", "Color Map: OFF", "workspacePage.preview.colorMapOff")}
                  </button>
                  <button
                    type="button"
                    className="skill-copy-btn"
                    onClick={refreshSkillMarkdown}
                    disabled={isDocMappingLive || activeDoc !== "skill"}
                  >
                    {t("同步一次", "Sync Once", "workspacePage.preview.syncOnce")}
                  </button>
                  <button type="button" className="skill-copy-btn" onClick={copyMarkdown}>
                    {copied
                      ? t("已复制", "Copied", "workspacePage.preview.copied")
                      : t("复制", "Copy", "workspacePage.preview.copy")}
                  </button>
                </div>
              </div>
              <div className="vim-editor-body" ref={markdownPaneRef}>
                {markdownViewMode === "raw" ? (
                  <textarea
                    ref={markdownTextareaRef}
                    className={`vim-textarea${isModuleColorMappingOn ? " is-color-mapped" : ""}${
                      vimSubMode === "normal" ? " is-vim-normal" : " is-vim-insert"
                    }`}
                    value={currentMarkdown}
                    onChange={(event) => {
                      if (activeDoc !== "skill") return;
                      if (isDocMappingLive) {
                        setIsDocMappingLive(false);
                      }
                      setSkillMarkdown(event.target.value);
                    }}
                    readOnly={rawEditorReadOnly || activeDoc !== "skill"}
                    onKeyDown={onRawEditorKeyDown}
                    onClick={(event) => syncNodeSelectionFromRawEditor(event.currentTarget)}
                    onSelect={(event) => syncNodeSelectionFromRawEditor(event.currentTarget)}
                    onKeyUp={(event) => syncNodeSelectionFromRawEditor(event.currentTarget)}
                    spellCheck={false}
                    style={rawEditorStyle}
                    aria-label={t("Markdown 原始文本", "Markdown raw text", "workspacePage.preview.rawAria")}
                  />
                ) : (
                  <div
                    className={`skill-preview-render${isRenderedEditable ? " is-editable" : ""}`}
                    role="document"
                    aria-label={t("Markdown 预览", "Markdown preview", "workspacePage.preview.aria")}
                  >
                    {markdownBlocks.map((block, blockIndex) => {
                    const moduleClass = isModuleColorMappingOn
                      ? "md-module"
                      : "md-module md-module-no-map";
                    const isActiveBlock = activeMarkdownBlockId === block.id;
                    const isNodeLinkedBlock = block.relatedNodeIds.some((id) => selectedNodeIdSet.has(id));
                    const isRelatedToActiveBlock =
                      !isActiveBlock &&
                      activeMarkdownNodeIds.length > 0 &&
                      block.relatedNodeIds.some((id) => activeMarkdownNodeIdSet.has(id));
                    const primaryNode = block.primaryNodeId ? nodeMap.get(block.primaryNodeId) : null;
                    const primaryDefinition = primaryNode
                      ? NODE_LIBRARY[primaryNode.type] ?? NODE_LIBRARY.workflow
                      : null;
                    const fallbackModuleAccent =
                      markdownAssociationConfig.moduleAccentColors?.[block.module] ??
                      markdownAssociationConfig.moduleAccentColors?.general ??
                      "#9fb3c8";
                    const blockStyle = {
                      "--module-accent": primaryNode
                        ? sanitizeNodeColor(
                            normalizeNodeParams(primaryNode.params, primaryDefinition).color,
                            primaryDefinition?.color ?? DEFAULT_NODE_COLOR
                          )
                        : fallbackModuleAccent
                    };
                    const interactiveClassName = `${moduleClass} md-block${
                      isNodeLinkedBlock ? " is-linked" : ""
                    }${isRelatedToActiveBlock ? " is-related" : ""}${isActiveBlock ? " is-active" : ""}`;

                    const interactiveProps = {
                      ref: (element) => setMarkdownBlockRef(block.id, element),
                      onClick: () => onActivateMarkdownBlock(block),
                      onFocus: () => onActivateMarkdownBlock(block),
                      onKeyDown: isRenderedEditable ? undefined : (event) => onMarkdownBlockKeyDown(event, blockIndex),
                      tabIndex: 0,
                      contentEditable: isRenderedEditable,
                      suppressContentEditableWarning: isRenderedEditable,
                      onBlur: isRenderedEditable
                        ? (event) => applyRenderedBlockEdit(block.id, event.currentTarget.innerText)
                        : undefined,
                      "data-md-block-id": block.id
                    };

                    if (block.type === "heading") {
                      if (block.level === 1) {
                        return (
                          <h1
                            className={`md-heading md-h1 ${interactiveClassName}`}
                            key={block.id}
                            style={blockStyle}
                            {...interactiveProps}
                          >
                            {isRenderedEditable ? block.text : renderInlineText(block.text)}
                          </h1>
                        );
                      }
                      if (block.level === 2) {
                        return (
                          <h2
                            className={`md-heading md-h2 ${interactiveClassName}`}
                            key={block.id}
                            style={blockStyle}
                            {...interactiveProps}
                          >
                            {isRenderedEditable ? block.text : renderInlineText(block.text)}
                          </h2>
                        );
                      }
                      return (
                        <h3
                          className={`md-heading md-h3 ${interactiveClassName}`}
                          key={block.id}
                          style={blockStyle}
                          {...interactiveProps}
                        >
                          {isRenderedEditable ? block.text : renderInlineText(block.text)}
                        </h3>
                      );
                    }

                    if (block.type === "list") {
                      const marker = String(block.marker || "-");
                      const markerText = /^\d+\.$/.test(marker) ? marker : "•";
                      return (
                        <p
                          className={`md-list-line ${interactiveClassName}`}
                          key={block.id}
                          style={{
                            ...(blockStyle ?? {}),
                            paddingLeft: `${0.6 + Math.min(block.indent, 4) * 1}rem`
                          }}
                          {...interactiveProps}
                        >
                          {!isRenderedEditable && <span className="md-list-bullet">{markerText}</span>}
                          <span>{isRenderedEditable ? block.text : renderInlineText(block.text)}</span>
                        </p>
                      );
                    }

                    if (block.type === "quote") {
                      return (
                        <blockquote
                          className={`md-quote ${interactiveClassName}`}
                          key={block.id}
                          style={blockStyle}
                          {...interactiveProps}
                        >
                          {(block.lines?.length ? block.lines : [block.text]).map((line, lineIndex) => (
                            <p className="md-quote-line" key={`${block.id}-quote-${lineIndex}`}>
                              {isRenderedEditable ? line : renderInlineText(line)}
                            </p>
                          ))}
                        </blockquote>
                      );
                    }

                    if (block.type === "table") {
                      return (
                        <section
                          className={`md-table-wrap ${interactiveClassName}`}
                          key={block.id}
                          style={blockStyle}
                          ref={interactiveProps.ref}
                          onClick={interactiveProps.onClick}
                          onFocus={interactiveProps.onFocus}
                          onKeyDown={interactiveProps.onKeyDown}
                          tabIndex={interactiveProps.tabIndex}
                          data-md-block-id={interactiveProps["data-md-block-id"]}
                        >
                          <table className="md-table">
                            <thead>
                              <tr>
                                {(block.headers ?? []).map((cell, cellIndex) => (
                                  <th
                                    key={`${block.id}-head-${cellIndex}`}
                                    style={{
                                      textAlign: block.alignments?.[cellIndex] || "left"
                                    }}
                                  >
                                    {renderInlineText(cell)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(block.rows ?? []).map((row, rowIndex) => (
                                <tr key={`${block.id}-row-${rowIndex}`}>
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={`${block.id}-cell-${rowIndex}-${cellIndex}`}
                                      style={{
                                        textAlign: block.alignments?.[cellIndex] || "left"
                                      }}
                                    >
                                      {renderInlineText(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      );
                    }

                    if (block.type === "hr") {
                      return (
                        <hr
                          className={`md-hr ${interactiveClassName}`}
                          key={block.id}
                          style={blockStyle}
                          ref={interactiveProps.ref}
                          onClick={interactiveProps.onClick}
                          onFocus={interactiveProps.onFocus}
                          onKeyDown={interactiveProps.onKeyDown}
                          tabIndex={interactiveProps.tabIndex}
                          data-md-block-id={interactiveProps["data-md-block-id"]}
                        />
                      );
                    }

                    if (block.type === "code") {
                      return (
                        <section
                          className={`md-code-wrap ${interactiveClassName}`}
                          key={block.id}
                          style={blockStyle}
                          ref={interactiveProps.ref}
                          onClick={interactiveProps.onClick}
                          onFocus={interactiveProps.onFocus}
                          onKeyDown={interactiveProps.onKeyDown}
                          tabIndex={interactiveProps.tabIndex}
                          data-md-block-id={interactiveProps["data-md-block-id"]}
                        >
                          <div className="md-code-lang">{block.lang || "text"}</div>
                          <pre className="md-code-pre">
                            {isRenderedEditable ? (
                              <code
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(event) => applyRenderedBlockEdit(block.id, event.currentTarget.innerText)}
                              >
                                {block.code}
                              </code>
                            ) : (
                              <code dangerouslySetInnerHTML={{ __html: highlightCode(block.code, block.lang) }} />
                            )}
                          </pre>
                        </section>
                      );
                    }

                    return (
                      <p
                        className={`md-paragraph ${interactiveClassName}`}
                        key={block.id}
                        style={blockStyle}
                        {...interactiveProps}
                      >
                        {isRenderedEditable ? block.text : renderInlineText(block.text)}
                      </p>
                    );
                    })}
                  </div>
                )}
                {shouldShowStatusline && (
                <div className="vim-statusline">
                  <span>{activeDocumentName}</span>
                  <span>{t("行", "lines", "workspacePage.preview.lines")}:{markdownLines}</span>
                  <span>{t("字符", "chars", "workspacePage.preview.chars")}:{markdownChars}</span>
                  <span>{activeDoc === "skill" && isDocMappingLive
                    ? t("自动", "AUTO", "workspacePage.preview.auto")
                    : t("手动", "MANUAL", "workspacePage.preview.manual")}</span>
                    <span>
                      {vimSubMode === "insert"
                        ? t("编辑: Vim 插入", "Editor: Vim INSERT", "workspacePage.preview.editorVimInsert")
                        : t("编辑: Vim 普通", "Editor: Vim NORMAL", "workspacePage.preview.editorVimNormal")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </article>
  );
}

export default WorkspacePage;

