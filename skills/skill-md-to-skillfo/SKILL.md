---
name: "skill-md-to-skillfo"
description: "Guide an agent to convert a regular `SKILL.md` into a parser-compatible `SKILLFO.md` snapshot that can be imported back into the SkillFo workspace without data loss. This version must support causal semantic analysis, branch visualization, and atomic item operations for clearer structure and easier editing."
---
# Convert SKILL.md to Branch-Aware SKILLFO.md

## Objective
Guide an agent to convert a regular `SKILL.md` into a parser-compatible `SKILLFO.md` snapshot that can be imported back into the SkillFo workspace without data loss.

This version must support:
- Causal semantic analysis from natural language skill text.
- Branch visualization on the graph using causal edges and reference ports.
- Atomic item operations for clearer structure and easier editing.

## Trigger
Use this skill when the user asks for:
- Convert `SKILL.md` to `SKILLFO.md`
- Generate importable SkillFo workspace file from markdown skill doc
- Build round-trip compatible `SKILLFO.md` payload
- Build branch-aware skill graph from causal logic

## External Tool (Required)
Use the bundled validator as an external tool for every conversion result.

- Tool path: `scripts/validate-skillfo.mjs`
- Run from repo root:
  - `node skills/skill-md-to-skillfo/scripts/validate-skillfo.mjs <OUTPUT_SKILLFO_PATH>`
- Run from skill directory:
  - `node scripts/validate-skillfo.mjs <OUTPUT_SKILLFO_PATH>`

Blocking rules:
- If validator exits non-zero, the conversion is invalid and must be fixed before delivery.
- If validator reports parser-compatibility failure, treat it as a hard failure.
- Include validator output summary in the final response.

## Hard Requirements
- Keep all JSON property names in English and ASCII only.
- Output must contain the exact payload markers:
  - `<!-- SKILLFO_WORKSPACE_PAYLOAD_START -->`
  - `<!-- SKILLFO_WORKSPACE_PAYLOAD_END -->`
- Payload root fields must include:
  - `format`
  - `formatVersion`
  - `generatedAt`
  - `metadata`
  - `workspaceState`
  - `documents`
  - `graph`
  - `topology`
- Set:
  - `format = "skillfo.workspace.snapshot"`
  - `formatVersion = "1.0.0"`
- `documents.skillMarkdown` must preserve original input `SKILL.md` content as a string.
- Generated output must be parseable by JSON parser and importable by SkillFo parser.
- For branch clarity, causal relations must be represented as edges, not only inline text.

## Node Type Set
Prefer these node types:
- `prereq`
- `env`
- `workflow`
- `guardrail`
- `cli`
- `python`
- `js`
- `condition`
- `loop`

Fallback type: `workflow`.

## Causal Semantics Analysis
Before graph construction, parse each section into causal triples:
- `cause`
- `relation`
- `effect`

Detect common causal patterns (case-insensitive):
- Conditional: `if`, `when`, `provided that`, `in case`
- Negative condition: `unless`, `except if`
- Consequence: `then`, `so`, `therefore`, `thus`, `as a result`
- Reason: `because`, `since`, `due to`
- Alternative/fallback: `otherwise`, `else`, `or else`, `fallback`
- Iteration/retry: `retry`, `repeat`, `until`, `loop`

Normalize each detected relation to one of:
- `true_branch`
- `false_branch`
- `default_flow`
- `loop_flow`
- `exit_flow`
- `dependency`

## Atomic Item Rules
Items must be atomic, meaning one item does one thing:
- One imperative action per item.
- One condition check per item.
- One fallback behavior per item.
- One retry policy per item.

Do not merge unrelated behaviors into a single item.

Recommended atomic title patterns:
- `Check <entity>`
- `Compute <artifact>`
- `Call <tool or API>`
- `Handle <error case>`
- `Fallback <strategy>`
- `Retry <policy>`

If a paragraph contains multiple actions, split into multiple items in original order.

## Branch Graph Construction Rules
1. Build a base linear chain from section order.
2. Upgrade to branches when causal signals are detected.
3. Use edge `kind` to express causal type:
   - `true` for positive condition branch.
   - `false` for negative or fallback branch.
   - `loop` for loop body path.
   - `exit` for loop exit path.
   - `default` for neutral sequential flow.
4. Use `sourcePort > 0` on source node when multiple outgoing branches exist.
5. Keep one outgoing edge per `(from, sourcePort)`.

## Reference and Port Rules
Use reference tokens to bind textual items to branch ports:
- Token format: `_@<port>$_` where `<port>` is integer > 0.
- Example: `If validation fails, route to _@2$_ fallback handler.`

When token `_@N$_` appears in source node items:
- Create or map an outgoing edge from this node with `sourcePort = N`.
- Connect to the target node that implements the referenced effect.
- Prefer `kind=true/false/loop/exit` when semantics are explicit.

Use `params.referenceNotes` for display hints keyed by port number:
- Example:
  - `"1": "success path"`
  - `"2": "fallback path"`

## Node and Item Mapping
1. Read full `SKILL.md` source text as `originalSkillMarkdown`.
2. Extract metadata:
   - `skillName`: prefer frontmatter `name`, else first H1 text, else `"My Skill"`.
   - `description`: prefer frontmatter `description`, else first paragraph under H1, else `"Describe what this skill is for."`.
3. Build nodes from section blocks (H2 as main split):
   - Each H2 becomes one primary node.
   - Split section into auxiliary nodes when a section contains explicit branching logic with distinct effects.
4. Each node must include:
   - `id` (deterministic string, e.g. `node-{index}`)
   - `label`
   - `type`
   - `x`, `y`
   - `params` with:
     - `color` (hex string, fallback `#61afef`)
     - `summary`
     - `items`
     - `referenceOnly` (default `false`)
     - `referenceNotes` (default `{}`)
5. Build items from content:
   - Paragraph/plain lines -> `type: "list"`
   - Ordered list -> `type: "ordered"`
   - Fenced code block -> `type: "code"` with `language`
   - Markdown table -> `type: "table"` with `tableRows`, `tableCols`, `tableData`, `content`
   - IF/THEN/ELSE -> `type: "ifelse"` with `ifCondition`, `ifThen`, `ifElse`, `content`
6. Every item should include:
   - `id`
   - `title`
   - `type`
   - `applied` (default `true`)
   - `content` (or type-specific fields)

## Inference Rules for node.type
Use heading text (case-insensitive):
- contains `prereq`, `precondition` -> `prereq`
- contains `env`, `environment` -> `env`
- contains `guard`, `safety`, `policy` -> `guardrail`
- contains `cli`, `command`, `terminal` -> `cli`
- contains `python` -> `python`
- contains `javascript`, `typescript`, `node.js`, `js` -> `js`
- contains `condition`, `if` -> `condition`
- contains `loop`, `retry` -> `loop`
- otherwise -> `workflow`

## Workspace State Defaults
Use:
- `viewMode: "split"`
- `isDocMappingLive: false`
- `markdownViewMode: "raw"`
- `isModuleColorMappingOn: true`
- `vimSubMode: "normal"`
- `activeDoc: "skillfo"`
- `selectedNodeIds`: include `selectedNodeId` if non-null
- `selectedNodeId`
- `selectedFolderId`

## Topology Requirements
`topology` must be derived from `graph.edges` and include:
- `topologicalOrder`: node id array
- `outgoingByNode`: `{ nodeId: [{ edgeId, to, kind, sourcePort }] }`
- `incomingByNode`: `{ nodeId: [{ edgeId, from, kind, sourcePort }] }`

## Minimal Branch Example (JSON fragment)
```json
{
  "graph": {
    "nodes": [
      {
        "id": "node-check",
        "type": "condition",
        "label": "Validate Input",
        "x": 120,
        "y": 100,
        "params": {
          "color": "#d8b76c",
          "summary": "Validate request and branch by result.",
          "items": [
            {
              "id": "item-check-1",
              "title": "Validation Rule",
              "type": "ifelse",
              "applied": true,
              "ifCondition": "Request schema is valid",
              "ifThen": "Continue to _@1$_ success path",
              "ifElse": "Route to _@2$_ fallback path",
              "content": "IF: Request schema is valid\nTHEN:\n- Continue to _@1$_ success path\nELSE:\n- Route to _@2$_ fallback path"
            }
          ],
          "referenceOnly": false,
          "referenceNotes": {
            "1": "success path",
            "2": "fallback path"
          }
        }
      },
      {
        "id": "node-success",
        "type": "workflow",
        "label": "Process Request",
        "x": 380,
        "y": 40,
        "params": {
          "color": "#8ea4ff",
          "summary": "Main process.",
          "items": [],
          "referenceOnly": false,
          "referenceNotes": {}
        }
      },
      {
        "id": "node-fallback",
        "type": "guardrail",
        "label": "Return Validation Error",
        "x": 380,
        "y": 170,
        "params": {
          "color": "#ff8f95",
          "summary": "Fallback on invalid input.",
          "items": [],
          "referenceOnly": false,
          "referenceNotes": {}
        }
      }
    ],
    "edges": [
      {
        "id": "edge-true",
        "from": "node-check",
        "to": "node-success",
        "kind": "true",
        "sourcePort": 1
      },
      {
        "id": "edge-false",
        "from": "node-check",
        "to": "node-fallback",
        "kind": "false",
        "sourcePort": 2
      }
    ]
  }
}
```

## Output Markdown Envelope (must match)
````md
# SKILLFO.md

Machine-readable workspace snapshot.
All field names are declared in English to avoid parser ambiguity and encoding issues.

## SnapshotSummary
- format: skillfo.workspace.snapshot
- formatVersion: 1.0.0
- generatedAt: <ISO_DATETIME>
- nodeCount: <N>
- edgeCount: <N>
- folderCount: <N>
- selectedNodeCount: <N>

## GraphTopology
- <fromLabel> (<fromId>) -> <toLabel> (<toId>) [kind=<kind>, sourcePort=<port>, edgeId=<edgeId>]

## WorkspacePayload
<!-- SKILLFO_WORKSPACE_PAYLOAD_START -->
```json
{
  "format": "skillfo.workspace.snapshot",
  "formatVersion": "1.0.0",
  "generatedAt": "<ISO_DATETIME>",
  "metadata": {
    "skillName": "<skill name>",
    "description": "<description>"
  },
  "workspaceState": {
    "viewMode": "split",
    "isDocMappingLive": false,
    "markdownViewMode": "raw",
    "isModuleColorMappingOn": true,
    "vimSubMode": "normal",
    "activeDoc": "skillfo",
    "selectedNodeIds": [],
    "selectedNodeId": null,
    "selectedFolderId": null
  },
  "documents": {
    "skillMarkdown": "<verbatim SKILL.md content>"
  },
  "graph": {
    "metadata": {
      "skillName": "<skill name>",
      "description": "<description>"
    },
    "nodes": [],
    "edges": [],
    "folders": [],
    "selectedNodeId": null,
    "selectedFolderId": null
  },
  "topology": {
    "topologicalOrder": [],
    "outgoingByNode": {},
    "incomingByNode": {}
  }
}
```
<!-- SKILLFO_WORKSPACE_PAYLOAD_END -->
````

## Validation Checklist
- External validator command was executed and returned exit code `0`.
- Parser-compatibility check passed (regex extraction + JSON parse).
- JSON parses successfully.
- Marker comments are exact and present once.
- All keys are English ASCII.
- `graph.nodes[*].params.items[*]` shapes are valid for their `type`.
- All edges reference existing node ids.
- `selectedNodeId` is in `graph.nodes` or `null`.
- `selectedNodeIds` contains only existing ids and includes `selectedNodeId` when non-null.
- `topology` is consistent with `graph.edges`.
- `documents.skillMarkdown` is present and non-null.
- Branch edges use meaningful `kind` values.
- Multi-branch nodes use distinct positive `sourcePort` values.
- Reference tokens `_@N$_` are aligned with branch ports.
- Items are atomic (one item, one operation).

## Final Response Contract
When running this skill, the agent should output:
1. The generated `SKILLFO.md` content.
2. A short validation report using the checklist.
3. A brief branch map summary (condition node -> true/false/loop/exit targets).
4. Validator execution details (command + pass/fail + key counts).
