'use client';

import { useEffect, useState, ChangeEvent, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Filter, Activity, BarChart3, Clock, Car, Info, ChevronDown, Download, RefreshCcw, 
  Play, CheckCircle2, AlertCircle, FileVideo, Upload, Cpu, ShieldCheck, Zap
} from 'lucide-react';

interface AnalysisResults {
  total_count: number;
  type_breakdown: Record<string, number>;
  duration: number;
  full_tracking_history: [number, number, number, string][];
}

interface StatusInfo {
  status: string;
  progress: number;
  results: AnalysisResults | null;
  logs: string[];
}

export default function Home() {
  let API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://dazexxx-drone-traffic-analyzer.hf.space').toLowerCase();
  
  if (API_URL && !API_URL.startsWith('http')) {
    API_URL = `https://${API_URL}`;
  }
  
  const [status, setStatus] = useState<string>('Initializing...');
  const [progress, setProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingDone, setProcessingDone] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const filteredHistory = useMemo(() => {
    if (!results) return [];
    if (filterType === 'all') return results.full_tracking_history;
    return results.full_tracking_history.filter(det => det[3] === filterType);
  }, [results, filterType]);

  const chartData = useMemo(() => {
    if (!results) return [];
    const interval = 2;
    const buckets: Record<number, number> = {};
    for (let i = 0; i <= results.duration; i += interval) buckets[i] = 0;

    filteredHistory.forEach(det => {
      const time = det[1];
      const bucket = Math.floor(time / interval) * interval;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    return Object.entries(buckets).map(([time, count]) => ({
      time: `${time}s`,
      count
    })).sort((a, b) => parseInt(a.time) - parseInt(b.time));
  }, [results, filteredHistory]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.message);
        } else setStatus('Offline');
      } catch (error) {
        setStatus('Offline');
      }
    };
    checkHealth();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [API_URL]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'video/mp4') {
        setError('Please upload a valid .mp4 file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const startPolling = (vId: string) => {
    setIsProcessing(true);
    setVideoId(vId);
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/status/${vId}`);
        const data: StatusInfo = await response.json();
        if (data.status === 'processing') {
          setProgress(data.progress);
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          }
        }
        if (data.status === 'completed' && data.results) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsProcessing(false);
          setResults(data.results);
          setProgress(100);
          setProcessingDone(true);
        }
      } catch (err) { console.error('Polling error:', err); }
    }, 3000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setLogs([]);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        startPolling(data.video_id);
      } else setError('Upload failed. Server might be busy.');
    } catch (err) { setError('Connection failed. Backend is unreachable.'); }
    finally { setIsUploading(false); }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen text-slate-200">
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

      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto">
        {!processingDone && (
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Left Column: Branding & Features (Always Visible) */}
            <div className="lg:col-span-7 space-y-10 sticky top-32">
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
              
              <div className="grid grid-cols-3 gap-6">
                {[
                  { icon: Cpu, label: "Neural Engine", sub: "YOLOv8m" },
                  { icon: ShieldCheck, label: "Persistence", sub: "ByteTrack" },
                  { icon: Activity, label: "Real-time", sub: "A100 GPU" }
                ].map((item, i) => (
                  <div key={i} className="glass-card p-6 rounded-3xl space-y-3">
                    <item.icon className="w-6 h-6 text-brand-red" />
                    <div>
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Upload or Terminal */}
            <div className="lg:col-span-5">
              {!isProcessing ? (
                <div className="glass-panel p-10 rounded-[40px] space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-16 -mt-16"></div>
                  
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-black text-white">Upload Footage</h3>
                    <p className="text-sm text-slate-500">Provide an MP4 drone video for analysis</p>
                  </div>

                  <div 
                    className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-500 group/drop ${
                      file ? 'border-brand-red bg-brand-red/5' : 'border-slate-800 hover:border-brand-red/50 bg-slate-900/30'
                    }`}
                  >
                    <input type="file" accept=".mp4" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover/drop:scale-110 group-hover/drop:text-brand-red transition-all duration-500">
                        <Upload className="w-10 h-10" />
                      </div>
                      {file ? (
                        <div className="text-center">
                          <p className="text-lg font-bold text-white truncate max-w-[250px]">{file.name}</p>
                          <p className="text-xs text-brand-red font-black uppercase mt-1">Ready for Analysis</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-lg font-bold text-slate-300">Drop MP4 file here</p>
                          <p className="text-sm text-slate-500">Maximum size: 100MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium"><AlertCircle className="w-4 h-4" />{error}</div>}

                  <button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-2xl ${
                      file && !isUploading ? 'bg-brand-gradient text-white glow-red hover:brightness-110' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isUploading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Uploading...</> : 'Initiate Analysis'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="glass-panel p-6 rounded-3xl flex items-center justify-between border-brand-red/20">
                    <div className="flex items-center gap-4">
                      <Cpu className="w-6 h-6 text-brand-red animate-pulse" />
                      <div>
                        <p className="text-sm font-black text-white">Neural Processing Unit</p>
                        <p className="text-[10px] text-brand-red uppercase tracking-widest font-black">Active Stream</p>
                      </div>
                    </div>
                    <div className="text-xl font-black text-white">{progress}%</div>
                  </div>

                  {/* Mac-Style Terminal */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-red/20 to-brand-purple/20 rounded-[32px] blur-2xl opacity-50"></div>
                    <div className="relative bg-black/95 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
                      {/* Terminal Header */}
                      <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          zsh — neural_engine_v11
                        </div>
                        <div className="w-12"></div>
                      </div>

                      <div 
                        ref={terminalRef}
                        className="p-8 h-[380px] overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-none"
                      >
                        {logs.map((log, i) => (
                          <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
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
                        {logs.length === 0 && (
                          <div className="text-slate-500 italic animate-pulse">Establishing secure connection to HF ZeroGPU Space...</div>
                        )}
                        <div className="flex gap-2 items-center pt-2">
                          <span className="text-brand-red animate-pulse font-black">❯</span>
                          <span className="w-2 h-4 bg-brand-red/50 animate-pulse"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-brand-gradient h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(222,59,54,0.3)]" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {processingDone && videoId && results && (
          <div className="space-y-12 animate-in slide-in-from-bottom-12 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" />
                  Mission Completed
                </div>
                <h2 className="text-5xl font-black text-white tracking-tighter">Operational Analytics</h2>
              </div>
              <div className="flex gap-4">
                <a href={`${API_URL}/report/${videoId}`} download className="px-8 py-4 glass-card border-brand-red/30 text-white rounded-2xl font-black transition-all flex items-center gap-3 hover:bg-brand-red/10 active:scale-95"><Download className="w-5 h-5" />Export Report</a>
                <button onClick={() => { setProcessingDone(false); setVideoId(null); setFile(null); setResults(null); }} className="px-8 py-4 bg-brand-gradient text-white rounded-2xl font-black shadow-2xl glow-red flex items-center gap-3 hover:brightness-110 active:scale-95"><RefreshCcw className="w-5 h-5" />New Mission</button>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div className="glass-panel p-2 rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <video controls autoPlay muted playsInline className="w-full aspect-video rounded-[36px]" src={`${API_URL}/video/${videoId}`}>Your browser does not support video.</video>
                </div>

                <div className="glass-panel p-10 rounded-[40px] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Activity className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Temporal Intensity</h3>
                    </div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4 py-2 glass-card rounded-full">Interval: 2s</div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#de3b36" stopOpacity={0.3}/><stop offset="95%" stopColor="#de3b36" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: 'bold' }} itemStyle={{ color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="count" stroke="#de3b36" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" animationDuration={2000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[40px] space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red"><Filter className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Event Telemetry</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['all', ...Object.keys(results.type_breakdown)].map(type => (
                        <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-brand-gradient text-white shadow-lg' : 'glass-card text-slate-500 hover:text-white'}`}>{type}</button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                          <th className="pb-6 px-4">Timestamp</th><th className="pb-6 px-4">Entity ID</th><th className="pb-6 px-4">Classification</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredHistory.slice().reverse().slice(0, 10).map((det, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                            <td className="py-6 px-4 font-mono text-slate-400">{det[1]}s</td>
                            <td className="py-6 px-4 font-black text-blue-400">#TRK-{det[2]}</td>
                            <td className="py-6 px-4"><span className="px-3 py-1.5 glass-card rounded-lg text-[10px] font-black uppercase tracking-widest text-white">{det[3]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-4 space-y-8">
                <div className="glass-panel p-10 rounded-[40px] space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-gradient"></div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">{filterType === 'all' ? 'Total Fleet' : `${filterType}s`} Identified</p>
                    <p className="text-7xl font-black text-white tracking-tighter">{filteredHistory.length}</p>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gradient transition-all duration-1500 ease-out" style={{ width: `${(filteredHistory.length / results.total_count) * 100}%` }}></div>
                  </div>
                </div>
                
                <div className="glass-panel p-10 rounded-[40px] space-y-8">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black flex items-center gap-2"><BarChart3 className="w-3 h-3" />Fleet Composition</p>
                  <div className="space-y-6">
                    {Object.entries(results.type_breakdown).map(([type, count]) => (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                          <span className="text-slate-400">{type}</span>
                          <span className="text-white">{count}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-crimson transition-all duration-1000" style={{ width: `${(count / results.total_count) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[40px] space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Mission Time</p>
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-blue-400" />
                      <p className="text-3xl font-black text-white">{results.duration}<span className="text-sm font-light text-slate-500 ml-1">sec</span></p>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-gradient p-10 rounded-[40px] shadow-2xl glow-red space-y-4">
                  <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-black">Efficiency Metric</p>
                  <p className="text-xl font-black text-white leading-tight">
                    Session averaged {((results.total_count / results.duration) * 60).toFixed(1)} detections per minute.
                  </p>
                  <div className="pt-4 border-t border-white/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80">
                    <ShieldCheck className="w-4 h-4" />
                    Data Validated
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
