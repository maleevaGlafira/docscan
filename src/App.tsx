/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

import { ResultScreen } from '@/components/ResultScreen';
import { recognizeText } from '@/services/ocr';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Scan } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [screen, setScreen] = useState<'processing' | 'result'>('result');
  const [recognizedText, setRecognizedText] = useState('');
  const [fileModifiedAt, setFileModifiedAt] = useState<Date | null>(null);
  const [scannedAt, setScannedAt] = useState<Date | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Progress state
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleRecognize = async (overrideFiles?: File[]) => {
    const filesToProcess = overrideFiles || files;
    if (filesToProcess.length === 0) return;
    
    setScreen('processing');
    setProgress(0);
    setStatus('Initializing OCR engine...');
    
    try {
      const times = filesToProcess.map(f => f.lastModified).filter(Boolean);
      const newestTime = times.length > 0 ? Math.max(...times) : Date.now();
      const fileModifiedDate = new Date(newestTime);
      const scanDate = new Date();
      const combinedName = filesToProcess.map(f => f.name).join(', ');

      const text = await recognizeText(filesToProcess, (p, msg) => {
        setProgress(Math.round(p * 100));
        setStatus(msg);
      });
      
      setFileModifiedAt(fileModifiedDate);
      setScannedAt(scanDate);
      setFileName(combinedName);
      setRecognizedText(text);
      setScreen('result');
      toast.success('Text recognized successfully!');
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during text recognition.');
      setScreen('result');
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A051A] flex flex-col font-sans overflow-hidden text-white selection:bg-[#7B52FF]/30">
      <Toaster position="top-center" richColors />
      
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-[#7B52FF]/15 bg-[#0A051A]/90 backdrop-blur-md flex items-center justify-between px-8 z-55 shadow-sm shadow-[#0A051A]/30 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7B52FF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#7B52FF]/30 transition-transform hover:scale-105 duration-300">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-xl font-heading font-black tracking-tight text-white uppercase">
            DOCU<span className="text-[#7B52FF]">SCAN</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full border border-[#7B52FF]/20 bg-[#7352FF]/10 text-[#A689FF]">
            AI Agent Edition
          </span>
        </div>
      </nav>
      
      <main className="flex-1 w-full pt-16 pb-11 flex flex-col items-stretch justify-stretch bg-[#0A051A] overflow-hidden">
        <div className="w-full mx-auto flex flex-col flex-1 min-h-0 h-full">

        {screen === 'processing' && (
          <div className="w-full flex-1 flex items-center justify-center p-4">
            <Card className="border border-[#7B52FF]/20 shadow-2xl shadow-[#7B52FF]/5 bg-[#130B2B] rounded-2xl p-8 max-w-md w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7B52FF] to-transparent animate-pulse" />
              <CardContent className="p-0 flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-16 w-16 bg-[#7B52FF]/10 text-[#7B52FF] rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-[#7B52FF]/20">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <div className="space-y-2 w-full">
                  <h3 className="font-heading font-bold text-lg text-white tracking-wide">
                    Analyzing Documents
                  </h3>
                  <p className="text-sm text-[#B5AED7]/80 min-h-[20px] font-sans">
                    {status}
                  </p>
                </div>
                
                <div className="w-full bg-[#1A1231] rounded-full h-2 overflow-hidden border border-[#7B52FF]/10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7B52FF] to-[#A689FF] rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <p className="text-xs text-[#B5AED7] font-semibold tracking-wider font-mono">
                  {progress}% Complete
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {screen === 'result' && (
          <ResultScreen 
            initialText={recognizedText} 
            initialFileModifiedAt={fileModifiedAt}
            initialScannedAt={scannedAt}
            initialFileName={fileName}
            onRecognizeNewFiles={(newFiles) => {
              setFiles(newFiles);
              handleRecognize(newFiles);
            }}
          />
        )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-11 px-8 border-t border-[#7B52FF]/15 flex items-center justify-between text-[11px] text-[#B5AED7]/50 font-sans z-55 bg-[#0A051A]/95 backdrop-blur w-full">
        <div className="flex gap-6 uppercase tracking-wider font-medium">
          <span>OCR Engine: Gemini-3.5-Flash</span>
          <span className="hidden sm:inline">Grammar & Format: Active</span>
        </div>
        <div className="font-medium">&copy; 2026 DocuScan AI &bull; Agent Academy Design</div>
      </footer>
    </div>
  );
}
