import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_INSTRUCTION = `
You are an expert SQL parser and visualizer backend.
Your task is to analyze the SYNTACTIC structure of a SQL query and return a hierarchical tree of nodes.

**CRITICAL: Output Format**
You MUST return a valid JSON object with a "nodes" array, NOT a plain array or object without the "nodes" key.
Example correct format:
{
  "nodes": [
    { "id": "root", "label": "...", "type": "ROOT", ... },
    { "id": "cte1", "label": "...", "type": "CTE", "parentId": "root", ... }
  ]
}

**LANGUAGE REQUIREMENT:**
- The **structure** (keys like id, type, ast) must remain in English.
- The **content** for 'label' and 'explanation' MUST be in **Simplified Chinese (简体中文)**.

**CRITICAL RULES FOR HIERARCHY:**
1. **Root Node**: Represents the entire SQL file/input. Type must be "ROOT".
2. **CTE Definitions**: If the query uses a WITH clause, each CTE must be a DIRECT CHILD of the Root Node.
3. **Main Query**: The primary SELECT/INSERT/UPDATE statement is a sibling of the CTEs (child of Root). Type must be "MAIN_QUERY".
4. **Subqueries**: Any SELECT nested inside another must be a CHILD. Type must be "SUBQUERY".

**Output Schema (MUST be wrapped in {"nodes": [...]}):**
- **id**: Unique string (e.g., "root", "main-1", "cte-1")
- **label**: Short name in Chinese
- **type**: One of ['ROOT', 'CTE', 'MAIN_QUERY', 'SUBQUERY', 'UNION', 'JOIN_PART']
- **alias**: The alias if subquery/CTE. Null otherwise.
- **parentId**: The parent's id, or null for root.
- **sqlSnippet**: EXACT substring from source.
- **explanation**: Brief Chinese explanation.
- **ast**: { columns: [], sources: [], joins: [], conditions: [] }
**CRITICAL: Output Format for ast fields**
- **columns**: Array of objects with "name" and "expression" properties
  - Correct: [{"name": "user_id", "expression": "user_id"}, {"name": "total_revenue", "expression": "SUM(o.amount)"}]
  - WRONG: ["user_id", "total_revenue"]
- **sources**: Array of objects with "table" and "alias" properties
  - Correct: [{"table": "orders", "alias": "o"}, {"table": "payments", "alias": null}]
  - WRONG: ["orders", "payments"]
- **joins**: Array of objects with "type", "table", "condition" properties
  - Correct: [{"type": "INNER", "table": "payments", "condition": "o.order_id = p.order_id"}]
  - WRONG: [] or missing
- **conditions**: Array of strings
  - Correct: ["status = 'ACTIVE'", "last_login_date >= ..."]
  - WRONG: missing or empty
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sql } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2',
        max_tokens: 32000,
        thinking: { type: "disabled" },
        system: SYSTEM_INSTRUCTION,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: `Analyze this SQL query structure:\n\n${sql}`
              }
            ]
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API error: ${response.status} - ${errorText}` });
    }

    const data = await response.json();

    // Check if the response has an error structure
    if (data.error) {
      return res.status(401).json({ error: data.error.message || 'API authentication error' });
    }

    // Handle different response structures
    let text = '';

    // Case 1: Anthropic-style response with content array (with thinking disabled, it may just be text blocks)
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((block: any) => block.type === 'text');
      text = textContent?.text || '';
      // If no text block found but there are blocks, try the first block
      if (!text && data.content.length > 0) {
        text = data.content[0].text || data.content[0].content || JSON.stringify(data.content[0]);
      }
    }
    // Case 2: Direct text response (some providers)
    else if (typeof data.content === 'string') {
      text = data.content;
    }
    // Case 3: Text in choices array (OpenAI style)
    else if (data.choices && data.choices[0]?.message?.content) {
      text = data.choices[0].message.content;
    }
    // Case 4: Direct text field in response
    else if (data.text) {
      text = data.text;
    }

    if (!text) {
      // Return the full response for debugging, but with an error
      console.error('Unexpected API response structure:', JSON.stringify(data).substring(0, 500));
      return res.status(500).json({ error: 'No text content in AI response', debug: data });
    }

    // Strip markdown code blocks if present
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      // Try to extract valid JSON if the response is truncated
      const jsonMatch = text.match(/[\[\{][\s\S]*[\]\}]/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          return res.status(500).json({ error: `Failed to parse AI response: ${text.substring(0, 200)}` });
        }
      } else {
        return res.status(500).json({ error: `Failed to parse AI response: ${text.substring(0, 200)}` });
      }
    }

    // If result is an array, wrap it in { nodes: result }
    if (Array.isArray(result)) {
      result = { nodes: result };
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('AI Analysis Failed:', error);
    return res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}
