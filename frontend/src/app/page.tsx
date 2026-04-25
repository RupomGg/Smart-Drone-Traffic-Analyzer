'use client';

import { useEffect, useState, ChangeEvent, useRef, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Upload } from '@/components/Upload';
import { Terminal } from '@/components/Terminal';
import { Dashboard } from '@/components/Dashboard';

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
  const [error, setError] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingDone, setProcessingDone] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
    setElapsedTime(0);
    
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

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
          if (timerRef.current) clearInterval(timerRef.current);
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

  const resetAnalysis = () => {
    setProcessingDone(false);
    setVideoId(null);
    setFile(null);
    setResults(null);
    setLogs([]);
    setProgress(0);
  };

  return (
    <div className="min-h-screen text-slate-200">
      <Navbar status={status} />

      <main className="pt-28 pb-10 px-8 max-w-7xl mx-auto">
        {!processingDone ? (
          <Hero>
            {!isProcessing ? (
              <Upload 
                file={file} 
                isUploading={isUploading} 
                error={error} 
                handleFileChange={handleFileChange} 
                handleUpload={handleUpload} 
              />
            ) : (
              <Terminal 
                logs={logs} 
                progress={progress} 
                elapsedTime={elapsedTime} 
                terminalRef={terminalRef} 
              />
            )}
          </Hero>
        ) : (
          videoId && results && (
            <Dashboard 
              videoId={videoId}
              results={results}
              API_URL={API_URL}
              chartData={chartData}
              filteredHistory={filteredHistory}
              filterType={filterType}
              setFilterType={setFilterType}
              onReset={resetAnalysis}
            />
          )
        )}
      </main>
    </div>
  );
}
