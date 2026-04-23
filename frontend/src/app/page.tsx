'use client';

import { useEffect, useState, ChangeEvent, useRef } from 'react';

interface AnalysisResults {
  total_count: number;
  type_breakdown: Record<string, number>;
  duration: number;
  recent_detections: [number, number, string][];
}

export default function Home() {
  let API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://daZexxx-drone-traffic-analyzer.hf.space';
  // Ensure the URL has a protocol to prevent relative path issues
  if (API_URL && !API_URL.startsWith('http')) {
    API_URL = `https://${API_URL}`;
  }
  
  const [status, setStatus] = useState<string>('Connecting to API...');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingDone, setProcessingDone] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.message);
        } else {
          setStatus('Offline');
        }
      } catch (error) {
        console.error('Error fetching health status:', error);
        setStatus('Offline');
      }
    };

    checkHealth();
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setUploadStatus('');
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.type !== 'video/mp4') {
        setError('Only .mp4 files are accepted.');
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
        const data = await response.json();
        
        if (data.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsProcessing(false);
          setResults(data.results);
          setProcessingDone(true);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an MP4 file first.');
      return;
    }

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        startPolling(data.video_id);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Server connection failed.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 selection:bg-brand-red selection:text-white">
      {/* Sleek Top Nav */}
      <nav className="border-b border-slate-800 bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple via-brand-crimson to-brand-red flex items-center justify-center shadow-lg shadow-brand-crimson/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gradient">
              Smart Drone Traffic Analyzer
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-500 uppercase tracking-widest">System Status:</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
              <div className={`w-2 h-2 rounded-full ${status === 'Offline' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
              <span className={status === 'Offline' ? 'text-red-400' : 'text-green-400'}>{status}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!isProcessing && !processingDone && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-black text-white leading-tight">
                  Intelligent Traffic <br />
                  <span className="text-slate-500">Analysis from Above.</span>
                </h2>
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                  Upload your drone footage and let our YOLOv8-powered engine detect, track, and count vehicles with surgical precision.
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="p-4 bg-card-bg rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-2xl font-bold text-white">YOLOv8</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Detection</p>
                </div>
                <div className="p-4 bg-card-bg rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-2xl font-bold text-white">ByteTrack</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Persistence</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl mx-auto lg:ml-auto">
              <div className="p-8 bg-card-bg rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                <div 
                  className={`relative group border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                    file 
                      ? 'border-brand-red bg-brand-red/5' 
                      : 'border-slate-700 hover:border-brand-crimson bg-slate-900/50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform group-hover:text-brand-red">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">Drop your MP4 here</p>
                    <p className="text-sm text-slate-500">or click to browse your files</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".mp4" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-brand-red font-bold text-center">{error}</p>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file}
                  className={`w-full py-4 rounded-xl font-black text-lg transition-all transform active:scale-95 ${
                    file 
                      ? 'bg-gradient-to-r from-brand-purple to-brand-red text-white shadow-xl shadow-brand-red/20 hover:opacity-90' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Analyze Video
                </button>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center gap-10 py-20 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-slate-800 border-t-brand-red animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-red animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-black text-white">AI Engine Processing</h2>
              <p className="text-slate-400 max-w-sm">Detections are being calculated. Our ByteTrack algorithm is establishing object persistence across frames.</p>
            </div>
            <div className="w-full max-w-md bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-brand-purple via-brand-crimson to-brand-red h-full animate-progress-indeterminate"></div>
            </div>
          </div>
        )}

        {processingDone && videoId && results && (
          <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-brand-red">Analysis Success</span>
                <h2 className="text-4xl font-black text-white">Processed Results</h2>
              </div>
              <div className="flex gap-4">
                <a 
                  href={`${API_URL}/report/${videoId}`}
                  download
                  className="px-6 py-3 bg-gradient-to-r from-brand-purple to-brand-crimson text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 hover:opacity-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Report
                </a>
                <button 
                  onClick={() => { setProcessingDone(false); setVideoId(null); setFile(null); setResults(null); }}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  New Analysis
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-800">
                  <video 
                    controls 
                    autoPlay
                    className="w-full aspect-video"
                    src={`${API_URL}/video/${videoId}`}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="bg-card-bg rounded-3xl border border-slate-800 p-8 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Recent Detections
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest">
                          <th className="pb-4 px-2">Frame</th>
                          <th className="pb-4 px-2">Vehicle ID</th>
                          <th className="pb-4 px-2">Type</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {results.recent_detections.map((det, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                            <td className="py-4 px-2 text-slate-400">#{det[0]}</td>
                            <td className="py-4 px-2 font-mono text-blue-400">ID-{det[1]}</td>
                            <td className="py-4 px-2">
                              <span className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300 capitalize">
                                {det[2]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-card-bg rounded-2xl border border-slate-800 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Vehicle Count</p>
                    <p className="text-5xl font-black text-white">{results.total_count}</p>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-red w-full"></div>
                  </div>
                </div>
                
                <div className="p-6 bg-card-bg rounded-2xl border border-slate-800 space-y-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Breakdown by Type</p>
                  <div className="space-y-3">
                    {Object.entries(results.type_breakdown).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400 capitalize">{type}</span>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <div className="h-1.5 flex-1 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand-crimson" 
                              style={{ width: `${(count / results.total_count) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-card-bg rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Processing Duration</p>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xl font-bold text-white">{results.duration} seconds</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-brand-purple to-brand-crimson rounded-2xl shadow-xl space-y-2">
                  <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Infrastructure Efficiency</p>
                  <p className="text-sm text-white font-medium leading-relaxed">
                    Data indicates a vehicle throughput of {((results.total_count / results.duration) * 60).toFixed(1)} vehicles/min during this session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
