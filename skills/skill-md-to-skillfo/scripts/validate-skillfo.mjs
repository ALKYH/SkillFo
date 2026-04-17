#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const START_MARKER = "<!-- SKILLFO_WORKSPACE_PAYLOAD_START -->";
const END_MARKER = "<!-- SKILLFO_WORKSPACE_PAYLOAD_END -->";
const REQUIRED_ROOT_FIELDS = [
  "format",
  "formatVersion",
  "generatedAt",
  "metadata",
  "workspaceState",
  "documents",
  "graph",
  "topology"
];
const ALLOWED_EDGE_KINDS = new Set(["default", "true", "false", "loop", "exit"]);
const ALLOWED_ITEM_TYPES = new Set(["list", "ordered", "code", "table", "ifelse"]);
const REFERENCE_TOKEN_REGEX = /_@(\d+)\$_/g;

function parseArgs(argv) {
  const args = { targetPath: "SKILLFO.md", json: false, quiet: false };
  for (const token of argv) {
    if (token === "--json") {
      args.json = true;
      continue;
    }
    if (token === "--quiet") {
      args.quiet = true;
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown argument: ${token}`);
    }
    args.targetPath = token;
  }
  return args;
}

function countOccurrences(content, token) {
  if (!token) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const found = content.indexOf(token, index);
    if (found < 0) break;
    count += 1;
    index = found + token.length;
  }
  return count;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isAsciiKey(key) {
  return /^[\x00-\x7F]+$/.test(key);
}

function collectReferencePortsFromText(text) {
  const ports = new Set();
  const source = String(text ?? "");
  REFERENCE_TOKEN_REGEX.lastIndex = 0;
  let match = REFERENCE_TOKEN_REGEX.exec(source);
  while (match) {
    const value = Number(match[1]);
    if (isInteger(value) && value > 0) ports.add(value);
    match = REFERENCE_TOKEN_REGEX.exec(source);
  }
  return ports;
}

function pushAllPorts(target, ports) {
  for (const port of ports) target.add(port);
}

class ValidationContext {
  constructor(filePath) {
    this.filePath = filePath;
    this.errors = [];
    this.warnings = [];
  }

  error(message) {
    this.errors.push(message);
  }

  warn(message) {
    this.warnings.push(message);
  }

  get ok() {
    return this.errors.length === 0;
  }
}

function extractPayloadSegment(markdown, context) {
  const startCount = countOccurrences(markdown, START_MARKER);
  const endCount = countOccurrences(markdown, END_MARKER);
  if (startCount !== 1) {
    context.error(`Marker count invalid: ${START_MARKER} appears ${startCount} times.`);
  }
  if (endCount !== 1) {
    context.error(`Marker count invalid: ${END_MARKER} appears ${endCount} times.`);
  }
  if (context.errors.length) return null;

  const startIndex = markdown.indexOf(START_MARKER);
  const endIndex = markdown.indexOf(END_MARKER);
  if (endIndex <= startIndex) {
    context.error("Payload marker ordering is invalid.");
    return null;
  }
  return markdown.slice(startIndex + START_MARKER.length, endIndex);
}

function extractPayloadJsonRobust(payloadSegment, context) {
  const normalized = payloadSegment.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  let fenceStart = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim().toLowerCase();
    if (trimmed === "```json") {
      fenceStart = i;
      break;
    }
  }

  if (fenceStart < 0) {
    context.error("Cannot find opening JSON fence (```json) inside payload segment.");
    return null;
  }

  let fenceEnd = -1;
  for (let i = fenceStart + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "```") {
      fenceEnd = i;
      break;
    }
  }

  if (fenceEnd < 0) {
    context.error("Cannot find closing code fence (```) for payload JSON.");
    return null;
  }

  const jsonText = lines.slice(fenceStart + 1, fenceEnd).join("\n").trim();
  if (!jsonText) {
    context.error("Payload JSON block is empty.");
    return null;
  }
  return jsonText;
}

function validateParserRegexCompatibility(payloadSegment, context) {
  const matched = payloadSegment.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!matched?.[1]) {
    context.error("Parser compatibility check failed: cannot extract payload via parser regex.");
    return;
  }
  const candidate = matched[1].trim();
  try {
    JSON.parse(candidate);
  } catch (error) {
    context.error(`Parser compatibility check failed: ${error.message}`);
  }
}

function parsePayload(jsonText, context) {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    context.error(`Invalid payload JSON: ${error.message}`);
    return null;
  }
}

function validateKeySetAscii(value, pathName, context) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateKeySetAscii(entry, `${pathName}[${index}]`, context));
    return;
  }

  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (!isAsciiKey(key)) {
      context.error(`${pathName} contains non-ASCII key: "${key}"`);
    }
    validateKeySetAscii(child, `${pathName}.${key}`, context);
  }
}

function requireString(value, label, context) {
  if (typeof value !== "string") {
    context.error(`${label} must be a string.`);
    return false;
  }
  return true;
}

function requireBoolean(value, label, context) {
  if (typeof value !== "boolean") {
    context.error(`${label} must be a boolean.`);
    return false;
  }
  return true;
}

function requireObject(value, label, context) {
  if (!isPlainObject(value)) {
    context.error(`${label} must be an object.`);
    return false;
  }
  return true;
}

function requireArray(value, label, context) {
  if (!Array.isArray(value)) {
    context.error(`${label} must be an array.`);
    return false;
  }
  return true;
}

function validateNodeItemShape(item, nodeId, itemIndex, context) {
  const basePath = `graph.nodes(${nodeId}).params.items[${itemIndex}]`;
  if (!requireObject(item, basePath, context)) return;

  requireString(item.id, `${basePath}.id`, context);
  requireString(item.title, `${basePath}.title`, context);
  requireString(item.type, `${basePath}.type`, context);
  requireBoolean(item.applied, `${basePath}.applied`, context);

  const type = item.type;
  if (!ALLOWED_ITEM_TYPES.has(type)) {
    context.error(`${basePath}.type must be one of ${Array.from(ALLOWED_ITEM_TYPES).join(", ")}.`);
    return;
  }

  if (type === "code") {
    requireString(item.language, `${basePath}.language`, context);
    requireString(item.content, `${basePath}.content`, context);
    return;
  }

  if (type === "ifelse") {
    requireString(item.ifCondition, `${basePath}.ifCondition`, context);
    requireString(item.ifThen, `${basePath}.ifThen`, context);
    requireString(item.ifElse, `${basePath}.ifElse`, context);
    requireString(item.content, `${basePath}.content`, context);
    return;
  }

  if (type === "table") {
    if (!isInteger(item.tableRows) || item.tableRows <= 0) {
      context.error(`${basePath}.tableRows must be a positive integer.`);
    }
    if (!isInteger(item.tableCols) || item.tableCols <= 0) {
      context.error(`${basePath}.tableCols must be a positive integer.`);
    }
    if (!Array.isArray(item.tableData)) {
      context.error(`${basePath}.tableData must be a 2D array.`);
    } else {
      item.tableData.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) {
          context.error(`${basePath}.tableData[${rowIndex}] must be an array.`);
          return;
        }
        row.forEach((cell, cellIndex) => {
          if (typeof cell !== "string") {
            context.error(`${basePath}.tableData[${rowIndex}][${cellIndex}] must be a string.`);
          }
        });
      });
    }
    requireString(item.content, `${basePath}.content`, context);
    return;
  }

  requireString(item.content, `${basePath}.content`, context);
}

function validateTopology(payload, graphNodes, graphEdges, nodeIdSet, edgeById, context) {
  const topology = payload.topology;
  if (!requireObject(topology, "topology", context)) return;

  if (!requireArray(topology.topologicalOrder, "topology.topologicalOrder", context)) return;
  const topologicalOrder = topology.topologicalOrder;
  const seen = new Set();
  for (const nodeId of topologicalOrder) {
    if (typeof nodeId !== "string" || !nodeIdSet.has(nodeId)) {
      context.error(`topology.topologicalOrder contains unknown node id: ${String(nodeId)}`);
      continue;
    }
    if (seen.has(nodeId)) {
      context.error(`topology.topologicalOrder contains duplicated node id: ${nodeId}`);
      continue;
    }
    seen.add(nodeId);
  }
  if (seen.size !== graphNodes.length) {
    context.error("topology.topologicalOrder must include each node exactly once.");
  }

  if (!requireObject(topology.outgoingByNode, "topology.outgoingByNode", context)) return;
  if (!requireObject(topology.incomingByNode, "topology.incomingByNode", context)) return;

  const expectedOutgoingCount = new Map(graphNodes.map((node) => [node.id, 0]));
  const expectedIncomingCount = new Map(graphNodes.map((node) => [node.id, 0]));
  graphEdges.forEach((edge) => {
    expectedOutgoingCount.set(edge.from, (expectedOutgoingCount.get(edge.from) || 0) + 1);
    expectedIncomingCount.set(edge.to, (expectedIncomingCount.get(edge.to) || 0) + 1);
  });

  for (const node of graphNodes) {
    const nodeId = node.id;
    const outgoing = topology.outgoingByNode[nodeId];
    const incoming = topology.incomingByNode[nodeId];

    if (!Array.isArray(outgoing)) {
      context.error(`topology.outgoingByNode.${nodeId} must be an array.`);
      continue;
    }
    if (!Array.isArray(incoming)) {
      context.error(`topology.incomingByNode.${nodeId} must be an array.`);
      continue;
    }

    if (outgoing.length !== expectedOutgoingCount.get(nodeId)) {
      context.error(`topology.outgoingByNode.${nodeId} length mismatch with graph.edges.`);
    }
    if (incoming.length !== expectedIncomingCount.get(nodeId)) {
      context.error(`topology.incomingByNode.${nodeId} length mismatch with graph.edges.`);
    }

    for (const entry of outgoing) {
      if (!isPlainObject(entry)) {
        context.error(`topology.outgoingByNode.${nodeId} contains non-object entry.`);
        continue;
      }
      const edge = edgeById.get(String(entry.edgeId));
      if (!edge) {
        context.error(`topology.outgoingByNode.${nodeId} references unknown edgeId: ${String(entry.edgeId)}`);
        continue;
      }
      if (edge.from !== nodeId || edge.to !== entry.to || edge.kind !== entry.kind || edge.sourcePort !== entry.sourcePort) {
        context.error(`topology.outgoingByNode.${nodeId} entry mismatch for edgeId=${edge.id}.`);
      }
    }

    for (const entry of incoming) {
      if (!isPlainObject(entry)) {
        context.error(`topology.incomingByNode.${nodeId} contains non-object entry.`);
        continue;
      }
      const edge = edgeById.get(String(entry.edgeId));
      if (!edge) {
        context.error(`topology.incomingByNode.${nodeId} references unknown edgeId: ${String(entry.edgeId)}`);
        continue;
      }
      if (edge.to !== nodeId || edge.from !== entry.from || edge.kind !== entry.kind || edge.sourcePort !== entry.sourcePort) {
        context.error(`topology.incomingByNode.${nodeId} entry mismatch for edgeId=${edge.id}.`);
      }
    }
  }
}

function validateAtomicityHeuristic(graphNodes, context) {
  for (const node of graphNodes) {
    const items = Array.isArray(node?.params?.items) ? node.params.items : [];
    for (const item of items) {
      if (!isPlainObject(item)) continue;
      const content = String(item.content ?? "");
      const bulletCount = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^([-*+]|\d+\.)\s+/.test(line)).length;
      if (bulletCount > 1) {
        context.warn(
          `Atomicity heuristic: node=${node.id}, item=${String(item.id)} may contain multiple actions.`
        );
      }
    }
  }
}

function validatePayload(payload, context) {
  if (!requireObject(payload, "payload", context)) return;
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!(field in payload)) {
      context.error(`Missing root field: ${field}`);
    }
  }
  if (context.errors.length) return;

  if (payload.format !== "skillfo.workspace.snapshot") {
    context.error(`format must be "skillfo.workspace.snapshot", got "${String(payload.format)}".`);
  }
  if (payload.formatVersion !== "1.0.0") {
    context.error(`formatVersion must be "1.0.0", got "${String(payload.formatVersion)}".`);
  }
  requireString(payload.generatedAt, "generatedAt", context);
  requireObject(payload.metadata, "metadata", context);
  requireObject(payload.workspaceState, "workspaceState", context);
  requireObject(payload.documents, "documents", context);
  requireObject(payload.graph, "graph", context);
  requireObject(payload.topology, "topology", context);

  validateKeySetAscii(payload, "payload", context);

  if (typeof payload.documents.skillMarkdown !== "string") {
    context.error("documents.skillMarkdown must be a non-null string.");
  }

  const graph = payload.graph;
  if (!requireArray(graph.nodes, "graph.nodes", context)) return;
  if (!requireArray(graph.edges, "graph.edges", context)) return;
  if (!requireArray(graph.folders, "graph.folders", context)) return;

  const nodeIdSet = new Set();
  for (let i = 0; i < graph.nodes.length; i += 1) {
    const node = graph.nodes[i];
    const basePath = `graph.nodes[${i}]`;
    if (!requireObject(node, basePath, context)) continue;

    requireString(node.id, `${basePath}.id`, context);
    requireString(node.type, `${basePath}.type`, context);
    requireString(node.label, `${basePath}.label`, context);
    if (typeof node.x !== "number" || Number.isNaN(node.x)) {
      context.error(`${basePath}.x must be a number.`);
    }
    if (typeof node.y !== "number" || Number.isNaN(node.y)) {
      context.error(`${basePath}.y must be a number.`);
    }

    if (typeof node.id === "string" && node.id.trim()) {
      if (nodeIdSet.has(node.id)) {
        context.error(`Duplicate node id: ${node.id}`);
      }
      nodeIdSet.add(node.id);
    }

    if (!requireObject(node.params, `${basePath}.params`, context)) continue;
    requireString(node.params.color, `${basePath}.params.color`, context);
    requireString(node.params.summary, `${basePath}.params.summary`, context);
    requireBoolean(node.params.referenceOnly, `${basePath}.params.referenceOnly`, context);
    if (!requireObject(node.params.referenceNotes, `${basePath}.params.referenceNotes`, context)) continue;
    if (!requireArray(node.params.items, `${basePath}.params.items`, context)) continue;

    for (let j = 0; j < node.params.items.length; j += 1) {
      validateNodeItemShape(node.params.items[j], node.id, j, context);
    }
  }

  const edgeIdSet = new Set();
  const edgeById = new Map();
  const edgePortKeySet = new Set();
  const outgoingByNode = new Map();

  for (let i = 0; i < graph.edges.length; i += 1) {
    const edge = graph.edges[i];
    const basePath = `graph.edges[${i}]`;
    if (!requireObject(edge, basePath, context)) continue;
    requireString(edge.id, `${basePath}.id`, context);
    requireString(edge.from, `${basePath}.from`, context);
    requireString(edge.to, `${basePath}.to`, context);
    requireString(edge.kind, `${basePath}.kind`, context);
    if (!isInteger(edge.sourcePort) || edge.sourcePort < 0) {
      context.error(`${basePath}.sourcePort must be an integer >= 0.`);
    }

    if (typeof edge.id === "string" && edge.id.trim()) {
      if (edgeIdSet.has(edge.id)) {
        context.error(`Duplicate edge id: ${edge.id}`);
      }
      edgeIdSet.add(edge.id);
      edgeById.set(edge.id, edge);
    }
    if (typeof edge.from === "string" && !nodeIdSet.has(edge.from)) {
      context.error(`${basePath}.from references unknown node id: ${edge.from}`);
    }
    if (typeof edge.to === "string" && !nodeIdSet.has(edge.to)) {
      context.error(`${basePath}.to references unknown node id: ${edge.to}`);
    }
    if (!ALLOWED_EDGE_KINDS.has(String(edge.kind))) {
      context.error(`${basePath}.kind must be one of ${Array.from(ALLOWED_EDGE_KINDS).join(", ")}.`);
    }

    if (typeof edge.from === "string" && isInteger(edge.sourcePort)) {
      const portKey = `${edge.from}::${edge.sourcePort}`;
      if (edgePortKeySet.has(portKey)) {
        context.error(`Duplicate outgoing edge for (from=${edge.from}, sourcePort=${edge.sourcePort}).`);
      }
      edgePortKeySet.add(portKey);

      const next = outgoingByNode.get(edge.from) ?? [];
      next.push(edge);
      outgoingByNode.set(edge.from, next);
    }
  }

  for (const [nodeId, edges] of outgoingByNode.entries()) {
    if (edges.length <= 1) continue;
    for (const edge of edges) {
      if (!isInteger(edge.sourcePort) || edge.sourcePort <= 0) {
        context.error(`Multi-branch node ${nodeId} must use positive sourcePort; got ${String(edge.sourcePort)}.`);
      }
    }
  }

  const ws = payload.workspaceState;
  if (ws.selectedNodeId !== null && typeof ws.selectedNodeId !== "string") {
    context.error("workspaceState.selectedNodeId must be string or null.");
  }
  if (ws.selectedNodeId && !nodeIdSet.has(ws.selectedNodeId)) {
    context.error("workspaceState.selectedNodeId must exist in graph.nodes.");
  }
  if (!Array.isArray(ws.selectedNodeIds)) {
    context.error("workspaceState.selectedNodeIds must be an array.");
  } else {
    for (const id of ws.selectedNodeIds) {
      if (typeof id !== "string" || !nodeIdSet.has(id)) {
        context.error(`workspaceState.selectedNodeIds contains unknown node id: ${String(id)}`);
      }
    }
    if (ws.selectedNodeId && !ws.selectedNodeIds.includes(ws.selectedNodeId)) {
      context.error("workspaceState.selectedNodeIds must include workspaceState.selectedNodeId when non-null.");
    }
  }

  if (graph.selectedNodeId !== null && typeof graph.selectedNodeId !== "string") {
    context.error("graph.selectedNodeId must be string or null.");
  }
  if (graph.selectedNodeId && !nodeIdSet.has(graph.selectedNodeId)) {
    context.error("graph.selectedNodeId must exist in graph.nodes.");
  }

  const folderIdSet = new Set();
  for (let i = 0; i < graph.folders.length; i += 1) {
    const folder = graph.folders[i];
    const basePath = `graph.folders[${i}]`;
    if (!requireObject(folder, basePath, context)) continue;
    requireString(folder.id, `${basePath}.id`, context);
    if (typeof folder.id === "string") {
      if (folderIdSet.has(folder.id)) context.error(`Duplicate folder id: ${folder.id}`);
      folderIdSet.add(folder.id);
    }
  }

  if (ws.selectedFolderId !== null && typeof ws.selectedFolderId !== "string") {
    context.error("workspaceState.selectedFolderId must be string or null.");
  }
  if (ws.selectedFolderId && !folderIdSet.has(ws.selectedFolderId)) {
    context.error("workspaceState.selectedFolderId must exist in graph.folders.");
  }
  if (graph.selectedFolderId !== null && typeof graph.selectedFolderId !== "string") {
    context.error("graph.selectedFolderId must be string or null.");
  }
  if (graph.selectedFolderId && !folderIdSet.has(graph.selectedFolderId)) {
    context.error("graph.selectedFolderId must exist in graph.folders.");
  }

  validateTopology(payload, graph.nodes, graph.edges, nodeIdSet, edgeById, context);

  for (const node of graph.nodes) {
    const outgoing = (outgoingByNode.get(node.id) ?? []).map((edge) => edge.sourcePort);
    const outgoingPortSet = new Set(outgoing);
    const referencedPorts = new Set();

    const items = Array.isArray(node?.params?.items) ? node.params.items : [];
    for (const item of items) {
      if (!isPlainObject(item)) continue;
      if (item.type === "ifelse") {
        pushAllPorts(referencedPorts, collectReferencePortsFromText(item.ifCondition));
        pushAllPorts(referencedPorts, collectReferencePortsFromText(item.ifThen));
        pushAllPorts(referencedPorts, collectReferencePortsFromText(item.ifElse));
      }
      pushAllPorts(referencedPorts, collectReferencePortsFromText(item.content));
    }

    for (const port of referencedPorts) {
      if (!outgoingPortSet.has(port)) {
        context.error(`Reference token mismatch: node=${node.id} references port ${port}, but no outgoing edge uses sourcePort=${port}.`);
      }
    }

    if (isPlainObject(node?.params?.referenceNotes)) {
      for (const key of Object.keys(node.params.referenceNotes)) {
        const port = Number(key);
        if (!isInteger(port) || port <= 0) {
          context.error(`referenceNotes key must be a positive integer string: node=${node.id}, key=${key}`);
          continue;
        }
        if (!outgoingPortSet.has(port)) {
          context.warn(`referenceNotes key has no outgoing edge: node=${node.id}, port=${port}`);
        }
      }
    }
  }

  validateAtomicityHeuristic(graph.nodes, context);
}

function buildReport(context, filePath) {
  return {
    file: filePath,
    status: context.ok ? "passed" : "failed",
    errorCount: context.errors.length,
    warningCount: context.warnings.length,
    errors: context.errors,
    warnings: context.warnings
  };
}

function printReport(report, jsonMode, quiet) {
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (quiet) return;

  console.log(`SKILLFO Validator: ${report.status.toUpperCase()}`);
  console.log(`file: ${report.file}`);
  console.log(`errors: ${report.errorCount}`);
  console.log(`warnings: ${report.warningCount}`);
  if (report.errors.length) {
    console.log("");
    console.log("Error details:");
    report.errors.forEach((msg, idx) => console.log(`${idx + 1}. ${msg}`));
  }
  if (report.warnings.length) {
    console.log("");
    console.log("Warning details:");
    report.warnings.forEach((msg, idx) => console.log(`${idx + 1}. ${msg}`));
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Argument error: ${error.message}`);
    process.exit(2);
  }

  const resolvedPath = path.resolve(process.cwd(), args.targetPath);
  const context = new ValidationContext(resolvedPath);

  let markdown = "";
  try {
    markdown = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    context.error(`Cannot read file: ${error.message}`);
  }

  if (context.ok) {
    const payloadSegment = extractPayloadSegment(markdown, context);
    if (payloadSegment) {
      validateParserRegexCompatibility(payloadSegment, context);
      const payloadJsonText = extractPayloadJsonRobust(payloadSegment, context);
      if (payloadJsonText) {
        const payload = parsePayload(payloadJsonText, context);
        if (payload) {
          validatePayload(payload, context);
        }
      }
    }
  }

  const report = buildReport(context, resolvedPath);
  printReport(report, args.json, args.quiet);
  process.exit(report.errorCount > 0 ? 1 : 0);
}

main();
