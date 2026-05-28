/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadScreen } from '@/components/UploadScreen';

import { ResultScreen } from '@/components/ResultScreen';
import { recognizeText } from '@/services/ocr';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Scan } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [screen, setScreen] = useState<'upload' | 'processing' | 'result'>('upload');
  const [recognizedText, setRecognizedText] = useState('');
  
  // Progress state
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleRecognize = async () => {
    if (files.length === 0) return;
    
    setScreen('processing');
    setProgress(0);
    setStatus('Initializing OCR engine...');
    
    try {
      const text = await recognizeText(files, (p, msg) => {
        setProgress(Math.round(p * 100));
        setStatus(msg);
      });
      
      setRecognizedText(text);
      setScreen('result');
      toast.success('Text recognized successfully!');
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during text recognition.');
      setScreen('upload'); // go back to upload if error
    }
  };

  const handleBack = () => {
    setScreen('upload');
    setRecognizedText('');
    setFiles([]); // Optionally clear files, or keep them. Let's let the user keep them if they just want to add more
  };

  return (
    <div className="h-screen w-full bg-[#0A051A] flex flex-col font-sans overflow-hidden text-white selection:bg-[#7B52FF]/30">
      <Toaster position="top-center" richColors />
      
      <nav className="h-16 border-b border-[#7B52FF]/15 bg-[#0A051A]/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-40 shadow-sm shadow-[#0A051A]/30">
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

      <main className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-[linear-gradient(135deg,_rgb(238,_238,_238)_0%,_rgb(169,_184,_195)_100%)]">
        <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 justify-center">
        {screen === 'upload' && (
          <UploadScreen 
            files={files} 
            setFiles={setFiles} 
            onRecognize={handleRecognize} 
          />
        )}

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
            onBack={handleBack} 
          />
        )}
        </div>
      </main>

      <footer className="h-11 px-8 border-t border-[#7B52FF]/15 flex items-center justify-between text-[11px] text-[#B5AED7]/50 font-sans shrink-0 bg-[#0A051A]/60 backdrop-blur">
        <div className="flex gap-6 uppercase tracking-wider font-medium">
          <span>OCR Engine: Gemini-3.5-Flash</span>
          <span className="hidden sm:inline">Grammar & Format: Active</span>
        </div>
        <div className="font-medium">&copy; 2026 DocuScan AI &bull; Agent Academy Design</div>
      </footer>
    </div>
  );
}
