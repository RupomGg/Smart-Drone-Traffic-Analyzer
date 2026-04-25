'use client';

import { Car } from 'lucide-react';

interface NavbarProps {
  status: string;
}

export const Navbar = ({ status }: NavbarProps) => (
  <nav className="fixed top-0 inset-x-0 z-50 glass-panel h-20">
    <div className="max-w-7xl mx-auto h-full px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg glow-red animate-float">
          <Car className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-none">SmartDrone</h1>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-red">Traffic Analytics</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 glass-card rounded-full border-glass-border">
          <div className={`w-2 h-2 rounded-full ${status === 'Offline' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
          <span className={`text-xs font-bold ${status === 'Offline' ? 'text-red-400' : 'text-green-400'}`}>{status}</span>
        </div>
      </div>
    </div>
  </nav>
);
