import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert SQL parser and visualizer backend.
Your task is to analyze the SYNTACTIC structure of a SQL query and return a hierarchical tree of nodes.

**LANGUAGE REQUIREMENT:**
- The **structure** (keys like id, type, ast) must remain in English.
- The **content** for 'label' and 'explanation' MUST be in **Simplified Chinese (简体中文)**.

**CRITICAL RULES FOR HIERARCHY:**
1. **Root Node**: Represents the entire SQL file/input.
2. **CTE Definitions**: If the query uses a WITH clause, each CTE (Common Table Expression) definition must be a DIRECT CHILD of the Root Node.
   - **IMPORTANT**: Even if "CTE_B" selects from "CTE_A", treat them as SIBLING definitions in the WITH block. Do NOT nest CTEs inside each other. They are parallel definitions.
3. **Main Query**: The primary SELECT/INSERT/UPDATE statement is a sibling of the CTEs (child of Root).
4. **Subqueries**: Any SELECT statement nested physically inside a FROM, JOIN, WHERE, HAVING, or Projection clause must be a CHILD of the node containing it.
   - Example: "SELECT * FROM (SELECT ...) t1" -> The inner SELECT is a child of the outer SELECT.
   - **Alias Extraction**: If a subquery is aliased (e.g., "... ) t1"), you MUST extract "t1" into the 'alias' field.

**IMPORTANT: SQL SNIPPET EXTRACTION**
- The \`sqlSnippet\` field MUST be the **EXACT** substring from the original code, preserving original whitespace, newlines, comments, and case.
- **DO NOT** reformat, pretty-print, or normalize the SQL in the snippet.
- **DO NOT** remove comments inside the snippet.

**Output Schema Requirements:**
For each node, provide:
- **id**: Unique string.
- **label**: Short name in Chinese (e.g., "主查询", "区域销售CTE", "子查询 t1").
- **type**: One of ['ROOT', 'CTE', 'MAIN_QUERY', 'SUBQUERY', 'UNION', 'JOIN_PART'].
- **alias**: The alias string if this block is a subquery or CTE (e.g. "t1", "my_table"). Null otherwise.
- **parentId**: The ID of the syntactic container node.
- **sqlSnippet**: The EXACT character-for-character substring from the source.
- **explanation**: Brief explanation of what this block does in Chinese.
- **ast**: Extract key details:
  - **columns**: Array of objects { name: "output_name", expression: "formula_or_source" }.
  - **sources**: Array of objects { table: "table_name", alias: "alias_if_exists" }.
  - **joins**: Array of objects { type: "INNER/LEFT", table: "target_table", condition: "on_clause" }.
  - **conditions**: Simple string array of WHERE/HAVING clauses.
`;

export const analyzeSql = async (sql: string): Promise<AnalysisResult> => {
  try {
    // Call Vercel serverless function which proxies to MiniMax API
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Analysis Failed:', error);
    throw error;
  }
};
