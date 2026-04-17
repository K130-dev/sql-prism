import React, { useState } from 'react';
import { SqlNode, AstColumn, AstSource, AstJoin } from '../types';

interface AstInspectorProps {
  node: SqlNode | null;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!children) return null;
  // If children is an array and empty, don't render
  if (Array.isArray(children) && children.length === 0) return null;

  return (
    <div className="border border-[#2A2B40] rounded-lg overflow-hidden bg-[#18192A] mb-3 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-[#18192A] hover:bg-[#1F2035] transition-colors text-left"
      >
        <span className="text-xs uppercase tracking-wider text-indigo-200 font-bold flex items-center gap-2">
          {title}
        </span>
        <svg 
          className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-3 bg-[#11121F] border-t border-[#2A2B40] flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const AstInspector: React.FC<AstInspectorProps> = ({ node }) => {
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-indigo-300/50 p-8 text-center bg-[#11121F]">
        <p>在左侧节点图中标注以解析抽象语法架构。</p>
      </div>
    );
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ROOT': return 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
      case 'CTE': return 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]';
      case 'MAIN_QUERY': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
      case 'SUBQUERY': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
      default: return 'bg-white/5 text-indigo-200 border-[#2A2B40]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#11121F] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2B40] bg-[#18192A]">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTypeStyle(node.type)}`}>
            {node.type}
          </span>
          <span className="text-indigo-500/70 text-xs font-mono">{node.id}</span>
        </div>
        <h2 className="text-lg font-bold text-indigo-50 mb-2 leading-tight">{node.label}</h2>
        <p className="text-sm text-indigo-200/60">{node.explanation}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-transparent">
        
        <div className="space-y-1">
          
          {/* Columns */}
          {node.ast.columns.length > 0 && (
            <DetailSection title="字段 Projections" defaultOpen={true}>
              <div className="grid grid-cols-1 gap-2">
                {node.ast.columns.map((col, idx) => (
                  <div key={idx} className="p-2 bg-[#18192A] border border-[#2A2B40] rounded text-sm flex flex-col hover:border-fuchsia-500/50 transition-colors">
                    <span className="font-bold text-indigo-100">{col.name}</span>
                    {col.expression && col.expression !== col.name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-indigo-300 font-mono bg-[#11121F] p-1 rounded w-fit">
                        <span className="text-indigo-500">fn:</span>
                        {col.expression}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Combined Sources & Joins */}
          {(node.ast.sources.length > 0 || node.ast.joins.length > 0) && (
            <DetailSection title="来源与连接 Sources & Joins" defaultOpen={true}>
              
              {/* Sources List */}
              {node.ast.sources.length > 0 && (
                 <div className="flex flex-col gap-2">
                  {node.ast.sources.map((src, idx) => (
                    <div key={`src-${idx}`} className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm">
                      <span className="font-semibold text-blue-300">{src.table}</span>
                      {src.alias && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-mono">
                          AS {src.alias}
                        </span>
                      )}
                    </div>
                  ))}
                 </div>
              )}

              {/* Separator if both exist */}
              {node.ast.sources.length > 0 && node.ast.joins.length > 0 && (
                 <div className="my-1 border-t border-[#2A2B40]"></div>
              )}

              {/* Joins List */}
              {node.ast.joins.length > 0 && (
                 <div className="flex flex-col gap-1">
                   {node.ast.joins.map((join, idx) => (
                    <div key={`join-${idx}`} className="relative pl-3 border-l-2 border-indigo-500/50 py-1 mb-1 last:mb-0">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase text-indigo-300 bg-[#2A2B40]/50 px-1 rounded">{join.type} JOIN</span>
                          <span className="font-bold text-indigo-100 text-sm">{join.table}</span>
                       </div>
                       <div className="text-xs font-mono text-indigo-300 bg-[#18192A] p-1.5 rounded border border-[#2A2B40] break-all">
                          ON {join.condition}
                       </div>
                    </div>
                  ))}
                 </div>
              )}
            </DetailSection>
          )}

          {/* Conditions */}
          {node.ast.conditions.length > 0 && (
             <DetailSection title="条件 Conditions" defaultOpen={false}>
               {node.ast.conditions.map((cond, idx) => (
                 <div key={idx} className="px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-300 font-mono break-words">
                   {cond}
                 </div>
               ))}
             </DetailSection>
          )}

          {/* Group By / Order By */}
          {(node.ast.groupBy?.length ?? 0) > 0 && (
             <DetailSection title="分组 Group By" defaultOpen={false}>
                <div className="flex flex-wrap gap-2">
                   {node.ast.groupBy?.map((g, i) => (
                      <span key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-xs font-mono text-slate-300">{g}</span>
                   ))}
                </div>
             </DetailSection>
          )}

           {(node.ast.orderBy?.length ?? 0) > 0 && (
             <DetailSection title="排序 Order By" defaultOpen={false}>
                <div className="flex flex-wrap gap-2">
                   {node.ast.orderBy?.map((o, i) => (
                      <span key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-xs font-mono text-slate-300">{o}</span>
                   ))}
                </div>
             </DetailSection>
          )}

        </div>
      </div>
    </div>
  );
};