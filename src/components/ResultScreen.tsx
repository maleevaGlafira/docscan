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
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-140px)] min-h-[400px]">
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full h-full">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Processing Complete
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" 
              title="Copy to clipboard"
            >
              <Copy className="h-5 w-5" />
            </button>
            <button 
              onClick={handleDownload}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-slate-900 transition-colors"
            >
              <Download className="h-4 w-4" /> 
              <span className="hidden sm:inline">Download .txt</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-8 bg-slate-50/30 overflow-hidden relative group">
          <textarea
            className="w-full h-full bg-white border border-slate-100 rounded shadow-inner p-6 sm:p-8 text-slate-700 whitespace-pre-wrap overflow-y-auto resize-none outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="No text recognized..."
            style={{ paddingLeft: '3rem', fontSize: '15px', lineHeight: '21.75px', fontFamily: 'Verdana' }}
          />
        </div>
      </div>
    </div>
  );
}
