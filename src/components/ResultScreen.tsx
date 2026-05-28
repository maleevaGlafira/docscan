import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { postProcessText } from '@/utils/postProcess';

interface ResultScreenProps {
  initialText: string;
  onBack: () => void;
}

export function ResultScreen({ initialText, onBack }: ResultScreenProps) {
  const [text, setText] = useState(() => postProcessText(initialText));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recognized_text.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-140px)] min-h-[420px]">
      <div className="flex-1 flex flex-col bg-[#130B2B] rounded-2xl border border-[#7B52FF]/20 shadow-2xl shadow-black/30 overflow-hidden w-full h-full relative">
        <div className="px-6 py-4 bg-[#1A1237]/60 border-b border-[#7B52FF]/15 flex items-center justify-between shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-[#130B2B] border border-[#7B52FF]/25 hover:border-[#7B52FF]/50 rounded-xl text-xs font-bold text-white hover:bg-[#1A1231] transition-all duration-200 cursor-pointer shadow-sm group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[#7B52FF]/10 border border-[#7B52FF]/20 rounded-xl text-xs font-bold text-[#A689FF] select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Analysis Complete
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy}
              className="p-2.5 text-[#B5AED7]/70 hover:text-white hover:bg-[#7B52FF]/15 rounded-xl transition-all duration-200 border border-[#7B52FF]/15 cursor-pointer" 
              title="Copy to clipboard"
            >
              <Copy className="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={handleDownload}
              className="px-4 py-2 bg-[#7B52FF] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#6836FF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-[#7B52FF]/25 border-none"
            >
              <Download className="h-4 w-4" /> 
              <span className="hidden sm:inline">Download .txt</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 bg-transparent overflow-hidden relative group">
          <textarea
            className="w-full h-full bg-[#0A051A]/60 border border-[#7B52FF]/10 rounded-xl p-6 sm:p-8 text-white whitespace-pre-wrap overflow-y-auto resize-none outline-none focus:border-[#7B52FF]/40 focus:ring-1 focus:ring-[#7B52FF]/20 transition-all font-sans leading-relaxed text-[15px] shadow-inner"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="No text recognized..."
            style={{ paddingLeft: '3rem', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.01em' }}
          />
        </div>
      </div>
    </div>
  );
}
