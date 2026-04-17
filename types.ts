export interface AstSource {
  table: string;
  alias?: string;
}

export interface AstColumn {
  name: string;       // The output name (alias or column name)
  expression: string; // The underlying logic/calculation
}

export interface AstJoin {
  type: string; // INNER, LEFT, etc.
  table: string; // The table being joined
  condition: string; // The ON clause
}

export interface AstDetails {
  columns: AstColumn[];
  sources: AstSource[]; 
  joins: AstJoin[];
  conditions: string[]; // Where/Having clauses
  groupBy?: string[];
  orderBy?: string[];
}

export interface SqlNode {
  id: string;
  label: string; // Short name e.g. "Main Query", "Subquery A"
  type: 'ROOT' | 'CTE_BLOCK' | 'CTE' | 'MAIN_QUERY' | 'SUBQUERY' | 'UNION' | 'JOIN_PART';
  sqlSnippet: string;
  explanation: string;
  parentId?: string | null; // For tree construction
  ast: AstDetails;
  alias?: string; // The alias of this node in the parent query (e.g. "t1")
}

export interface AnalysisResult {
  nodes: SqlNode[];
}

export enum QueryStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}