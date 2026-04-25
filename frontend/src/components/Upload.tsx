'use client';

import { Upload as UploadIcon, AlertCircle } from 'lucide-react';
import { ChangeEvent } from 'react';

interface UploadProps {
  file: File | null;
  isUploading: boolean;
  error: string;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
}

export const Upload = ({ file, isUploading, error, handleFileChange, handleUpload }: UploadProps) => (
  <div className="glass-panel p-8 rounded-[40px] space-y-6 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-16 -mt-16"></div>
    
    <div className="space-y-1 text-center">
      <h3 className="text-xl font-black text-white">Upload Footage</h3>
      <p className="text-xs text-slate-500">Provide an MP4 drone video for analysis</p>
    </div>

    <div 
      className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all duration-500 group/drop ${
        file ? 'border-brand-red bg-brand-red/5' : 'border-slate-800 hover:border-brand-red/50 bg-slate-900/30'
      }`}
    >
      <input type="file" accept=".mp4" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover/drop:scale-110 group-hover/drop:text-brand-red transition-all duration-500">
          <UploadIcon className="w-8 h-8" />
        </div>
        {file ? (
          <div className="text-center">
            <p className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</p>
            <p className="text-[10px] text-brand-red font-black uppercase mt-1">Ready for Analysis</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-base font-bold text-slate-300">Drop MP4 file here</p>
            <p className="text-[10px] text-slate-500">Maximum size: 100MB</p>
          </div>
        )}
      </div>
    </div>

    {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"><AlertCircle className="w-4 h-4" />{error}</div>}

    <button
      onClick={handleUpload}
      disabled={!file || isUploading}
      className={`w-full py-4 rounded-xl font-black text-base transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-xl ${
        file && !isUploading ? 'bg-brand-gradient text-white glow-red hover:brightness-110' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
      }`}
    >
      {isUploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Uploading...</> : 'Initiate Analysis'}
    </button>
  </div>
);
