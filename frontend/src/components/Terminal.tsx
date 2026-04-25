'use client';

import { Cpu } from 'lucide-react';
import { RefObject } from 'react';

interface TerminalProps {
  logs: string[];
  progress: number;
  elapsedTime: number;
  terminalRef: RefObject<HTMLDivElement | null>;
}

export const Terminal = ({ logs, progress, elapsedTime, terminalRef }: TerminalProps) => (
  <div className="space-y-4 animate-in fade-in zoom-in duration-500">
    <div className="glass-panel p-5 rounded-3xl flex items-center justify-between border-brand-red/20">
      <div className="flex items-center gap-4">
        <Cpu className="w-5 h-5 text-brand-red animate-pulse" />
        <div>
          <p className="text-xs font-black text-white">Neural Processing Unit</p>
          <div className="flex items-center gap-2">
            <p className="text-[9px] text-brand-red uppercase tracking-widest font-black">Active Stream</p>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <p className="text-[9px] text-slate-400 font-mono">ET: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</p>
          </div>
        </div>
      </div>
      <div className="text-lg font-black text-white">{progress}%</div>
    </div>

    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-brand-red/20 to-brand-purple/20 rounded-[32px] blur-xl opacity-50"></div>
      <div className="relative bg-black/95 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-white/5 border-b border-white/5 px-5 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">zsh — neural_engine_v11</div>
          <div className="w-10"></div>
        </div>
        <div 
          ref={terminalRef}
          className="p-6 h-[340px] overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-none style-scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-slate-800 shrink-0 font-black">{i.toString().padStart(3, '0')}</span>
              <span className={`
                ${log.includes('[SYSTEM]') ? 'text-blue-400' : ''}
                ${log.includes('[GPU]') ? 'text-purple-400' : ''}
                ${log.includes('[ENGINE]') ? 'text-green-400 font-bold' : ''}
                ${log.includes('[TRACKER]') ? 'text-brand-red font-black underline decoration-brand-red/20 underline-offset-4' : ''}
                ${log.includes('[TELEMETRY]') ? 'text-yellow-400 font-black bg-yellow-400/5 px-2 py-0.5 rounded' : 'text-slate-300'}
              `}>
                {log}
              </span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-slate-500 italic animate-pulse">Establishing secure connection to HF...</div>}
          <div className="flex gap-2 items-center pt-1"><span className="text-brand-red animate-pulse font-black">❯</span><span className="w-2 h-3.5 bg-brand-red/50 animate-pulse"></span></div>
        </div>
      </div>
    </div>

    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
      <div className="bg-brand-gradient h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(222,59,54,0.3)]" style={{ width: `${progress}%` }}></div>
    </div>
  </div>
);
