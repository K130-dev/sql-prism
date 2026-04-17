import { GoogleGenAI, Type } from "@google/genai";
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
- **ast**: Extract key details:
  - **columns**: Array of objects { name: "output_name", expression: "formula_or_source" }.
  - **sources**: Array of objects { table: "table_name", alias: "alias_if_exists" }.
  - **joins**: Array of objects { type: "INNER/LEFT", table: "target_table", condition: "on_clause" }.
  - **conditions**: Simple string array of WHERE/HAVING clauses.
`;

export const analyzeSql = async (sql: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this SQL query structure:\n\n${sql}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique ID like 'node_1'" },
                  label: { type: Type.STRING, description: "Human readable label in Chinese" },
                  type: { type: Type.STRING, enum: ['ROOT', 'CTE', 'MAIN_QUERY', 'SUBQUERY', 'UNION', 'JOIN_PART'] },
                  alias: { type: Type.STRING, description: "The alias of the subquery/CTE in the parent query (e.g. 't1')", nullable: true },
                  sqlSnippet: { type: Type.STRING, description: "The EXACT source code substring for this block" },
                  explanation: { type: Type.STRING, description: "Brief explanation of what this block does in Chinese" },
                  parentId: { type: Type.STRING, description: "ID of the parent node. Null if Root.", nullable: true },
                  ast: {
                    type: Type.OBJECT,
                    properties: {
                      columns: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING, description: "The alias or output column name" },
                            expression: { type: Type.STRING, description: "The original expression or column, e.g. SUM(amount)" }
                          },
                          required: ["name", "expression"]
                        } 
                      },
                      sources: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            table: { type: Type.STRING },
                            alias: { type: Type.STRING, nullable: true }
                          },
                          required: ["table"]
                        } 
                      },
                      joins: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            type: { type: Type.STRING },
                            table: { type: Type.STRING },
                            condition: { type: Type.STRING }
                          },
                          required: ["type", "table", "condition"]
                        } 
                      },
                      conditions: { type: Type.ARRAY, items: { type: Type.STRING } },
                      groupBy: { type: Type.ARRAY, items: { type: Type.STRING } },
                      orderBy: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["columns", "sources", "joins", "conditions"]
                  }
                },
                required: ["id", "label", "type", "sqlSnippet", "explanation", "ast"]
              }
            }
          },
          required: ["nodes"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    throw error;
  }
};