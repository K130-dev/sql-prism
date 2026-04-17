import React, { useState, useEffect, useRef } from 'react';
import { analyzeSql } from './services/aiService';
import { AnalysisResult, QueryStatus, SqlNode } from './types';
import { QueryVisualizer } from './components/QueryVisualizer';
import { AstInspector } from './components/AstInspector';
import { LandingPage } from './components/LandingPage';

// Updated default query: A typical e-commerce data pipeline snippet
const DEFAULT_QUERY = `
WITH ActiveUsers AS (
    -- 获取近30天活跃用户
    SELECT user_id, user_name, region
    FROM app_users
    WHERE status = 'ACTIVE'
      AND last_login_date >= CURRENT_DATE - INTERVAL '30 days'
),
OrderMetrics AS (
    -- 聚合用户的订单指标
    SELECT 
        o.user_id,
        COUNT(o.order_id) AS total_orders,
        SUM(o.amount) AS total_revenue,
        MAX(o.order_date) AS last_order_date
    FROM orders o
    JOIN payments p ON o.order_id = p.order_id
    WHERE p.status = 'COMPLETED'
    GROUP BY o.user_id
),
TopCustomers AS (
    -- 计算各地区用户的消费排名
    SELECT 
        au.user_name,
        au.region,
        om.total_orders,
        om.total_revenue,
        RANK() OVER(PARTITION BY au.region ORDER BY om.total_revenue DESC) as region_rank
    FROM ActiveUsers au
    JOIN OrderMetrics om ON au.user_id = om.user_id
    WHERE om.total_revenue > 1000
)
-- 输出各地区消费排名前5的硬核买家
SELECT 
    user_name,
    region,
    total_orders,
    total_revenue
FROM TopCustomers
WHERE region_rank <= 5
ORDER BY region, total_revenue DESC;
`;

const MainApp: React.FC = () => {
  const [sqlInput, setSqlInput] = useState<string>(DEFAULT_QUERY.trim());
  const [status, setStatus] = useState<QueryStatus>(QueryStatus.IDLE);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<SqlNode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Refs for synced scrolling
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth / 4 : 320);
  const [inspectorWidth, setInspectorWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth / 4 : 320);
  
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingInspector, setIsResizingInspector] = useState(false);

  // Resize Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(250, Math.min(600, e.clientX)));
      }
      if (isResizingInspector) {
        const newWidth = e.clientX - sidebarWidth;
        setInspectorWidth(Math.max(250, Math.min(800, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingInspector(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingSidebar || isResizingInspector) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizingSidebar, isResizingInspector, sidebarWidth]);

  // Sync scroll between textarea and backdrop
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  /**
   * Advanced Tokenizer for SQL to get significant indices.
   * Skips whitespace and comments (--, /* *\/).
   * Preserves everything else, normalizing case for comparison.
   */
  const getSignificantIndices = (code: string) => {
    const indices: number[] = [];
    let significantStr = '';
    
    let i = 0;
    const n = code.length;
    let state: 'NORMAL' | 'STRING_SINGLE' | 'STRING_DOUBLE' | 'COMMENT_LINE' | 'COMMENT_BLOCK' = 'NORMAL'; 
    
    while (i < n) {
      const char = code[i];
      const nextChar = i + 1 < n ? code[i + 1] : '';
      
      if (state === 'NORMAL') {
        if (/\s/.test(char)) {
          // Skip whitespace
          i++;
          continue;
        }
        
        // Check for comments
        if (char === '-' && nextChar === '-') {
          state = 'COMMENT_LINE';
          i += 2;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          state = 'COMMENT_BLOCK';
          i += 2;
          continue;
        }
        
        // Check for strings
        if (char === "'") {
          state = 'STRING_SINGLE';
          indices.push(i);
          significantStr += char; 
          i++;
          continue;
        }
        if (char === '"') {
          state = 'STRING_DOUBLE';
          indices.push(i);
          significantStr += char;
          i++;
          continue;
        }
        
        // Regular significant char
        indices.push(i);
        significantStr += char.toLowerCase();
        i++;
        
      } else if (state === 'STRING_SINGLE') {
        indices.push(i);
        significantStr += char.toLowerCase(); // Normalize string content too for fuzzy matching
        
        if (char === "'" && code[i-1] !== '\\') { // Basic escape check
           state = 'NORMAL';
        }
        i++;
        
      } else if (state === 'STRING_DOUBLE') {
        indices.push(i);
        significantStr += char.toLowerCase();
        
        if (char === '"' && code[i-1] !== '\\') {
           state = 'NORMAL';
        }
        i++;
        
      } else if (state === 'COMMENT_LINE') {
        if (char === '\n') {
          state = 'NORMAL';
        }
        i++;
        
      } else if (state === 'COMMENT_BLOCK') {
        if (char === '*' && nextChar === '/') {
          state = 'NORMAL';
          i += 2;
        } else {
          i++;
        }
      }
    }
    
    return { indices, significantStr };
  };

  /**
   * Robustly locates the snippet using strict tokenization.
   */
  const locateSnippet = (fullText: string, snippet: string): { start: number, end: number } | null => {
    if (!snippet) return null;

    // 1. Try exact match first (cheapest)
    const exactIdx = fullText.indexOf(snippet);
    if (exactIdx !== -1) {
      return { start: exactIdx, end: exactIdx + snippet.length };
    }

    // 2. Tokenized Fuzzy Match
    // This allows the AI to miss comments or whitespace, and still find the block.
    const fullData = getSignificantIndices(fullText);
    const snippetData = getSignificantIndices(snippet);

    // If snippet is empty after tokenization, abort
    if (snippetData.significantStr.length === 0) return null;

    const matchIdx = fullData.significantStr.indexOf(snippetData.significantStr);
    
    if (matchIdx !== -1) {
       const startSigIdx = matchIdx;
       const endSigIdx = matchIdx + snippetData.significantStr.length - 1;
       
       if (endSigIdx < fullData.indices.length) {
          const originalStart = fullData.indices[startSigIdx];
          // We map the end index to the last significant character + 1
          // But to look nicer, we might want to include trailing non-significant chars if the snippet had them?
          // For now, strict mapping is safer.
          // Note: indices array stores the index of the char in fullText.
          const originalEndCharIdx = fullData.indices[endSigIdx];
          
          return { start: originalStart, end: originalEndCharIdx + 1 };
       }
    }
    
    return null;
  };

  // Scroll to highlight when selection changes
  useEffect(() => {
    if (selectedNode && textareaRef.current && selectedNode.sqlSnippet) {
      // Small timeout ensures the highlight span has rendered in the DOM
      setTimeout(() => {
        const highlightEl = document.getElementById('highlighted-snippet');
        if (highlightEl && textareaRef.current) {
          // Calculate the Y offset of the highlighted element inside the backdrop
          const topPos = highlightEl.offsetTop;
          const containerHeight = textareaRef.current.clientHeight;
          // Center the highlight in the scroll view
          const scrollPos = Math.max(0, topPos - (containerHeight / 2) + (highlightEl.clientHeight / 2));
          
          textareaRef.current.scrollTo({
            top: scrollPos,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [selectedNode, sqlInput]);

  const handleAnalyze = async () => {
    if (!sqlInput.trim()) return;
    
    setStatus(QueryStatus.LOADING);
    setErrorMsg("");
    setSelectedNode(null);

    try {
      const result = await analyzeSql(sqlInput);
      setData(result);
      
      // Default to MAIN_QUERY if available, otherwise ROOT
      const defaultNode = result.nodes.find(n => n.type === 'MAIN_QUERY') || result.nodes.find(n => n.type === 'ROOT');
      if (defaultNode) setSelectedNode(defaultNode);
      
      setStatus(QueryStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze SQL. Please check your API key or input.");
      setStatus(QueryStatus.ERROR);
    }
  };

  // Render the highlighted text for the backdrop
  const renderHighlightedText = () => {
    if (!selectedNode || !selectedNode.sqlSnippet) {
      return <span className="text-slate-300">{sqlInput}</span>;
    }

    const location = locateSnippet(sqlInput, selectedNode.sqlSnippet);

    if (!location) {
        // Fallback if location fails (e.g. major mismatch)
        return <span className="text-slate-300">{sqlInput}</span>;
    }

    const { start, end } = location;
    const before = sqlInput.substring(0, start);
    const match = sqlInput.substring(start, end);
    const after = sqlInput.substring(end);

    return (
      <>
        <span className="text-slate-300 opacity-40 transition-opacity duration-300">{before}</span>
        <span id="highlighted-snippet" className="bg-fuchsia-500/20 text-fuchsia-100 rounded border-b-2 border-fuchsia-500 font-bold shadow-sm px-0.5 box-decoration-clone relative z-10 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
          {match}
        </span>
        <span className="text-slate-300 opacity-40 transition-opacity duration-300">{after}</span>
      </>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#11121F] text-indigo-50 font-sans overflow-hidden">
      
      {/* 1. Sidebar: Input (Resizable) */}
      <div 
        style={{ width: sidebarWidth }} 
        className="flex-shrink-0 flex flex-col border-r border-[#2A2B40] bg-[#18192A] transition-colors"
      >
        <div className="p-4 border-b border-[#2A2B40] flex justify-between items-center bg-[#11121F]">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
               <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-transparent border-b-cyan-400"></div>
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200">SQL Prism</h1>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={status === QueryStatus.LOADING}
            className={`px-4 py-1.5 rounded text-sm font-semibold transition-all shadow-sm ${
              status === QueryStatus.LOADING 
              ? 'bg-white/5 text-slate-500 cursor-wait' 
              : 'bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
            }`}
          >
            {status === QueryStatus.LOADING ? '解析中...' : '解析'}
          </button>
        </div>
        
        {/* Custom Layered Editor (Cyberpunk Dark Mode) */}
        <div className="flex-1 relative group overflow-hidden bg-[#18192A]">
          
          {/* Layer 1: Backdrop (Presentation) */}
          <div 
            ref={backdropRef}
            className="absolute inset-0 p-4 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none z-0 custom-scrollbar"
            style={{ fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', lineHeight: '1.6' }}
          >
            {renderHighlightedText()}
            {/* Add extra space at bottom to match textarea behavior */}
            <div className="h-8"></div> 
          </div>

          {/* Layer 2: Textarea (Interaction) */}
          <textarea 
            ref={textareaRef}
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            onScroll={handleScroll}
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm whitespace-pre-wrap break-words bg-transparent text-transparent caret-cyan-400 resize-none focus:outline-none z-10 custom-scrollbar selection:bg-cyan-500/30 selection:text-cyan-100"
            style={{ fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', lineHeight: '1.6' }}
            spellCheck={false}
            placeholder="Paste your complex SQL query here..."
          />
        </div>

        {status === QueryStatus.ERROR && (
          <div className="p-4 bg-red-900/30 border-t border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
      </div>

      {/* Resizer Handle 1 (Left) */}
      <div 
        className="w-1 cursor-col-resize hover:bg-fuchsia-500 bg-[#2A2B40] transition-colors z-20 flex-shrink-0"
        onMouseDown={() => setIsResizingSidebar(true)}
      />

      {/* 2. Middle: Inspector (Resizable) */}
      <div 
        style={{ width: inspectorWidth }} 
        className="flex-shrink-0 border-r border-[#2A2B40] bg-[#11121F] z-10 flex flex-col"
      >
        <AstInspector node={selectedNode} />
      </div>

      {/* Resizer Handle 2 (Right) */}
      <div 
        className="w-1 cursor-col-resize hover:bg-fuchsia-500 bg-[#2A2B40] transition-colors z-20 flex-shrink-0"
        onMouseDown={() => setIsResizingInspector(true)}
      />

      {/* 3. Main Content: Graph Area (Cyberpunk Base) */}
      <div className="flex-1 flex flex-col relative bg-[#11121F] overflow-hidden">
        {/* Cyberpunk grid in background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Neon glow in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Graph Area */}
        <div className="flex-1 relative z-10">
          {data ? (
            <QueryVisualizer 
              nodes={data.nodes} 
              onNodeSelect={setSelectedNode}
              selectedNodeId={selectedNode?.id}
            />
          ) : (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
               {status === QueryStatus.LOADING ? (
                 <div className="flex flex-col items-center">
                   <div className="relative w-12 h-12 mb-4">
                     <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                   <p className="text-cyan-400 font-medium tracking-wide">正在使用 AI 核心解析语法结构...</p>
                 </div>
               ) : (
                 <>
                   <svg className="w-24 h-24 mb-4 opacity-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                   <p className="text-slate-500 text-sm">在左侧粘贴查询代码并点击 <span className="text-fuchsia-400">解析</span> 开始工作。</p>
                 </>
               )}
             </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default function App() {
  const [isStarted, setIsStarted] = useState(false);

  if (!isStarted) {
    return <LandingPage onStart={() => setIsStarted(true)} />;
  }

  return <MainApp />;
}