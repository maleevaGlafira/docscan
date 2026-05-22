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
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans overflow-hidden text-slate-900 selection:bg-indigo-100">
      <Toaster position="top-center" richColors />
      
      <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Scan className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            DOCU<span className="text-indigo-600">SCAN</span>
          </span>
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl mx-auto flex flex-col">
        {screen === 'upload' && (
          <UploadScreen 
            files={files} 
            setFiles={setFiles} 
            onRecognize={handleRecognize} 
          />
        )}

        {screen === 'processing' && (
          <div className="w-full flex-1 flex items-center justify-center">
            <Card className="border border-slate-200 shadow-lg bg-white/80 backdrop-blur rounded-xl p-8 max-w-md w-full">
              <CardContent className="p-0 flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <div className="space-y-2 w-full">
                  <h3 className="font-semibold text-lg text-slate-800 uppercase tracking-widest">
                    Processing Documents
                  </h3>
                  <p className="text-sm text-slate-500 capitalize min-h-[20px]">
                    {status}
                  </p>
                </div>
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-xs text-slate-400 font-medium">
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

      <footer className="h-10 px-8 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0 bg-white">
        <div className="flex gap-6 uppercase tracking-widest">
          <span>OCR: Tesseract.js</span>
          <span>Spelling Correction: Active</span>
        </div>
        <div>&copy; 2024 DocuScan Professional</div>
      </footer>
    </div>
  );
}
