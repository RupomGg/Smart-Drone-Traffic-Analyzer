'use client';

import { Zap, Cpu, ShieldCheck, Activity } from 'lucide-react';
import { ReactNode } from 'react';

interface HeroProps {
  children: ReactNode;
}

export const Hero = ({ children }: HeroProps) => (
  <div className="grid lg:grid-cols-12 gap-12 items-start">
    {/* Left Column: Branding & Features */}
    <div className="lg:col-span-7 space-y-8 sticky top-28">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-black uppercase tracking-widest">
          <Zap className="w-3 h-3" />
          AI-Powered Surveillance
        </div>
        <h2 className="text-7xl font-black text-white leading-[0.9] tracking-tighter">
          Next-Gen <br />
          <span className="text-brand-gradient">Traffic Intel.</span>
        </h2>
        <p className="text-xl text-slate-400 max-w-xl leading-relaxed font-light">
          Transform raw drone footage into actionable insights. Leveraging <span className="text-white font-medium">YOLOv11</span> and <span className="text-white font-medium">ByteTrack</span> for surgical precision in vehicle tracking and counting.
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Cpu, label: "Neural Engine", sub: "YOLOv11m" },
          { icon: ShieldCheck, label: "Persistence", sub: "ByteTrack" },
          { icon: Activity, label: "Real-time", sub: "A100 GPU" }
        ].map((item, i) => (
          <div key={i} className="glass-card p-5 rounded-3xl space-y-2">
            <item.icon className="w-5 h-5 text-brand-red" />
            <div>
              <p className="text-xs font-black text-white">{item.label}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Right Column: Dynamic Content (Upload or Terminal) */}
    <div className="lg:col-span-5">
      {children}
    </div>
  </div>
);
