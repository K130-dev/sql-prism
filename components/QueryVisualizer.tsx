import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SqlNode } from '../types';

interface QueryVisualizerProps {
  nodes: SqlNode[];
  onNodeSelect: (node: SqlNode) => void;
  selectedNodeId?: string;
}

interface TreeData extends SqlNode {
  children?: TreeData[];
}

// Helper for consistent colors
const getNodeStyles = (type: string) => {
  switch (type) {
    case 'ROOT': return { solid: "#ef4444", soft: "rgba(239, 68, 68, 0.1)", text: "#fca5a5" }; // red-500, glow, red-300
    case 'CTE': return { solid: "#a855f7", soft: "rgba(168, 85, 247, 0.1)", text: "#d8b4fe" }; // purple-500
    case 'MAIN_QUERY': return { solid: "#10b981", soft: "rgba(16, 185, 129, 0.1)", text: "#6ee7b7" }; // emerald-500
    case 'SUBQUERY': return { solid: "#f59e0b", soft: "rgba(245, 158, 11, 0.1)", text: "#fcd34d" }; // amber-500
    default: return { solid: "#64748b", soft: "rgba(100, 116, 139, 0.1)", text: "#cbd5e1" }; // slate-500
  }
};

export const QueryVisualizer: React.FC<QueryVisualizerProps> = ({ nodes, onNodeSelect, selectedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const { width, height } = wrapperRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Zoom Controls ---
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const handleReset = () => {
    setHasRendered(false);
  };

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // --- Data Preparation ---
    const dataMap = new Map<string, TreeData>();
    nodes.forEach(node => dataMap.set(node.id, { ...node, children: [] }));

    let rootNode: TreeData | null = null;
    nodes.forEach(node => {
      if (node.parentId && dataMap.has(node.parentId)) {
        dataMap.get(node.parentId)!.children!.push(dataMap.get(node.id)!);
      } else {
        if (!rootNode || node.type === 'ROOT') {
          rootNode = dataMap.get(node.id)!;
        }
      }
    });

    if (!rootNode) return;

    // --- Configuration ---
    const nodeWidth = 220;
    const nodeHeight = 60; // Reduced height since explanation is removed
    const horizontalSpacing = 40;
    const verticalSpacing = 80;

    // --- Tree Layout (Vertical) ---
    const hierarchy = d3.hierarchy<TreeData>(rootNode);
    
    const treeLayout = d3.tree<TreeData>()
      .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing])
      .separation((a, b) => a.parent === b.parent ? 1.1 : 1.3);

    const root = treeLayout(hierarchy);

    // --- Grid Background (Dot Pattern) ---
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
        .attr("id", "grid")
        .attr("width", 40)
        .attr("height", 40)
        .attr("patternUnits", "userSpaceOnUse");
    
    // Draw grid lines instead of circles for cyberpunk feel
    pattern.append("path")
        .attr("d", "M 40 0 L 0 0 0 40")
        .attr("fill", "none")
        .attr("stroke", "rgba(99, 102, 241, 0.05)") // Very subtle indigo
        .attr("stroke-width", 1);

    svg.append("rect")
       .attr("width", "100%")
       .attr("height", "100%")
       .attr("fill", "url(#grid)")
       .style("pointer-events", "none");

    // --- Zoom & Pan Setup ---
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // --- Draw Links ---
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.1)") // Light slate line
      .attr("stroke-width", 2)
      .attr("d", d3.linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any
      );

    // --- Draw Nodes ---
    const nodeGroup = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        onNodeSelect(d.data);
      });

    // 1. Node Card Background (Rect)
    nodeGroup.append("rect")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("x", -nodeWidth / 2)
      .attr("y", 0) 
      .attr("rx", 6)
      .style("transition", "fill 0.2s ease, stroke 0.2s ease, filter 0.2s ease") 
      .attr("fill", d => {
        const isSelected = d.data.id === selectedNodeId;
        const styles = getNodeStyles(d.data.type);
        return isSelected ? styles.solid : "#18192A"; // Cyber dark background
      })
      .attr("stroke", d => {
        const isSelected = d.data.id === selectedNodeId;
        const styles = getNodeStyles(d.data.type);
        return isSelected ? styles.solid : "rgba(255,255,255,0.1)"; // Dark theme border
      })
      .attr("stroke-width", d => d.data.id === selectedNodeId ? 2 : 1)
      .style("filter", d => d.data.id === selectedNodeId 
        ? "drop-shadow(0px 0px 15px rgba(34,211,238,0.4))" 
        : "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
      );

    // 2. Node Type Label (Badge)
    nodeGroup.append("rect")
      .attr("x", -nodeWidth / 2 + 10)
      .attr("y", 10)
      .attr("width", d => d.data.type.length * 7 + 10) 
      .attr("height", 16)
      .attr("rx", 4)
      .attr("fill", d => {
         const styles = getNodeStyles(d.data.type);
         return d.data.id === selectedNodeId ? "rgba(0,0,0,0.2)" : styles.soft;
      });
      
    nodeGroup.append("text")
      .attr("x", -nodeWidth / 2 + 15)
      .attr("y", 21)
      .text(d => d.data.type)
      .style("font-size", "9px")
      .style("font-weight", "bold")
      .style("fill", d => {
         const styles = getNodeStyles(d.data.type);
         return styles.text; 
      });
      
    // 3. Alias Label (Right-aligned Badge) - Only if alias exists
    nodeGroup.each(function(d) {
        if (!d.data.alias) return;
        
        const g = d3.select(this);
        const aliasText = `AS ${d.data.alias}`;
        const charWidth = 6.5; // Approximate width per char for 9px font
        const width = Math.max(30, aliasText.length * charWidth + 10);
        const xPos = (nodeWidth / 2) - width - 10; // Right aligned
        
        // Background
        g.append("rect")
            .attr("x", xPos)
            .attr("y", 10)
            .attr("width", width)
            .attr("height", 16)
            .attr("rx", 4)
            .attr("fill", "rgba(56, 189, 248, 0.1)") // cyan-400 with opacity
            .attr("stroke", "rgba(56, 189, 248, 0.2)"); // cyan-400 stroke

        // Text
        g.append("text")
            .attr("x", xPos + width/2)
            .attr("y", 21)
            .attr("text-anchor", "middle")
            .text(aliasText)
            .style("font-size", "9px")
            .style("font-weight", "bold")
            .style("fill", "#7dd3fc"); // cyan-300
    });

    // 4. Main Label
    nodeGroup.append("text")
      .attr("x", -nodeWidth / 2 + 12)
      .attr("y", 42) 
      .text(d => {
        const str = d.data.label;
        return str.length > 30 ? str.substring(0, 30) + "..." : str;
      })
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .style("fill", d => d.data.id === selectedNodeId ? "#ffffff" : "#e2e8f0"); // slate-200
    
    // --- Initial Zoom to Fit/Center ---
    if (!hasRendered || dimensions.width > 0) { 
       let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
       root.descendants().forEach(d => {
         minX = Math.min(minX, d.x - nodeWidth/2);
         maxX = Math.max(maxX, d.x + nodeWidth/2);
         minY = Math.min(minY, d.y);
         maxY = Math.max(maxY, d.y + nodeHeight);
       });

       const treeWidth = maxX - minX;
       const treeHeight = maxY - minY;
       
       // Add some padding
       const paddingX = 100;
       const paddingY = 100;

       const availableWidth = dimensions.width - paddingX;
       const availableHeight = dimensions.height - paddingY;

       let scale = Math.min(
         1.2, 
         Math.min(availableWidth / treeWidth, availableHeight / treeHeight)
       );
       
       if (!isFinite(scale)) scale = 0.5;

       const initialTransform = d3.zoomIdentity
         .translate(
           (dimensions.width - treeWidth * scale) / 2 - minX * scale, 
           (dimensions.height - treeHeight * scale) / 2 - minY * scale + 40
         )
         .scale(scale);

       svg.call(zoom.transform, initialTransform);
       setHasRendered(true);
    }

  }, [nodes, dimensions, selectedNodeId, onNodeSelect, hasRendered]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-transparent rounded-lg overflow-hidden relative group">
      
      {/* Legend */}
      <div className="absolute top-4 left-4 text-xs text-indigo-200 pointer-events-none z-10 flex flex-col gap-1 p-2 bg-[#18192A]/90 rounded border border-[#2A2B40] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span> CTE (Definition)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Main Query</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Subquery (Nested)</div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center bg-[#18192A] border border-[#2A2B40] rounded shadow hover:bg-[#2A2B40] text-indigo-300 font-bold text-lg transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={handleReset}
          className="w-8 h-8 flex items-center justify-center bg-[#18192A] border border-[#2A2B40] rounded shadow hover:bg-[#2A2B40] text-indigo-300 transition-colors"
          title="Fit to Screen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center bg-[#18192A] border border-[#2A2B40] rounded shadow hover:bg-[#2A2B40] text-indigo-300 font-bold text-lg transition-colors"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};