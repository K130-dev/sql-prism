import React from 'react';
import { motion } from 'motion/react';
import { Database, Network, Sparkles, ChevronRight, Code2, Triangle } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="relative min-h-screen bg-[#11121F] text-indigo-100 font-sans overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:96px_96px]"></div>
      
      {/* Neon Atmospheric Blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none opacity-80">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-64 left-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute top-32 -right-32 w-[30rem] h-[30rem] bg-indigo-600/30 rounded-full blur-[150px]" 
        />
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
          className="absolute -bottom-32 left-0 w-[40rem] h-[40rem] bg-cyan-500/20 rounded-full blur-[150px]" 
        />
      </div>

      {/* Navbar */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 backdrop-blur-md">
            <Triangle className="w-5 h-5 text-cyan-400" />
            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-xl"></div>
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200">
            SQL Prism
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></span>
          Developed by <span className="text-slate-300">Wenkai</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-6 w-full max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-300 mb-8 backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI AST 智能解析驱动</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200"
        >
          SQL Prism
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed mx-auto font-medium"
        >
          将复杂的 SQL 逻辑折射为<span className="text-cyan-400">清晰架构图</span>。<br/>
          一款智能驱动的现代视觉解释器，自动梳理嵌套与连接。
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
            <button 
              onClick={onStart}
              className="relative flex items-center justify-center gap-2 px-8 py-4 bg-[#18192A] ring-1 ring-cyan-500/50 rounded-xl text-cyan-50 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:bg-[#1f2035] transition-all duration-300"
            >
              立刻开始解析
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 w-full text-left">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.4 }}
             className="relative p-6 rounded-2xl bg-[#18192A]/80 backdrop-blur-sm border border-[#2A2B40] hover:border-cyan-500/30 hover:bg-[#1F2035] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 ring-1 ring-cyan-500/20">
              <Network className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">交互式查询图谱</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              通过层级树状图直观地进行视觉导航。清晰呈现 CTE 公用表表达式和子查询是如何一步步汇入主查询的。
            </p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.5 }}
             className="relative p-6 rounded-2xl bg-[#18192A]/80 backdrop-blur-sm border border-[#2A2B40] hover:border-fuchsia-500/30 hover:bg-[#1F2035] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mb-6 ring-1 ring-fuchsia-500/20">
              <Sparkles className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI 语义解析引擎</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              基于前沿的大语言模型技术。突破了传统正则匹配的限制，能够精准识别并解释所有复杂生僻的 SQL 语法。
            </p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.6 }}
             className="relative p-6 rounded-2xl bg-[#18192A]/80 backdrop-blur-sm border border-[#2A2B40] hover:border-emerald-500/30 hover:bg-[#1F2035] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-500/20">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">深度上下文洞察</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              一键穿透。随时审查图谱中任意节点的数据来源、复杂的 JOIN 关联条件和特定的字段提取逻辑。
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
