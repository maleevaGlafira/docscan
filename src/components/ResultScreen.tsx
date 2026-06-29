import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, ArrowLeft, RefreshCw, CloudUpload, CheckCircle, Database, Loader2, X, ChevronRight, History, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import { postProcessText, isHtmlString } from '@/utils/postProcess';
import { saveDocument, subscribeToSavedDocuments, SavedDocument } from '@/services/firebase';
import { getPdfPreview } from '@/services/ocr';

interface ResultScreenProps {
  initialText: string;
  onRecognizeNewFiles: (newFiles: File[]) => void;
}

const MAX_FILES = 3;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/bmp'];

export function ResultScreen({ initialText, onRecognizeNewFiles }: ResultScreenProps) {
  const [text, setText] = useState(() => postProcessText(initialText));
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ id: string; savedToCloud: boolean; timestamp: Date } | null>(null);
  
  const [historyDocs, setHistoryDocs] = useState<SavedDocument[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // New states for the load file feature on result screen
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let active = true;
    
    const generatePreviews = async () => {
      const newPreviews = { ...previews };
      let changed = false;

      for (const file of newFiles) {
        const key = `${file.name}-${file.lastModified}-${file.size}`;
        if (!newPreviews[key]) {
          if (file.type.startsWith('image/')) {
            newPreviews[key] = URL.createObjectURL(file);
            changed = true;
          } else if (file.type === 'application/pdf') {
            const preview = await getPdfPreview(file);
            if (preview && active) {
              newPreviews[key] = preview;
              changed = true;
            }
          }
        }
      }

      if (changed && active) {
        setPreviews(newPreviews);
      }
    };
    
    generatePreviews();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFiles]);

  const processSelectedFiles = (selectedFiles: globalThis.File[]) => {
    let validFiles = Array.from(selectedFiles).filter(file => ALLOWED_TYPES.includes(file.type));
    
    if (validFiles.length !== selectedFiles.length) {
      toast.error('Some files were ignored. Only PDF, JPG, PNG, and BMP are supported.');
    }

    if (newFiles.length + validFiles.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} files simultaneously.`);
      validFiles = validFiles.slice(0, MAX_FILES - newFiles.length);
    }

    if (validFiles.length > 0) {
      setNewFiles([...newFiles, ...validFiles]);
      toast.success('Files loaded! Click "Start Text Recognition" below.');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const getFileIconInfo = (type: string) => {
    if (type === 'application/pdf') return { bg: 'bg-rose-500/10 border border-rose-500/30', text: 'text-rose-400', label: 'PDF' };
    if (type.startsWith('image/jpeg')) return { bg: 'bg-emerald-500/10 border border-emerald-500/30', text: 'text-emerald-400', label: 'JPG' };
    if (type.startsWith('image/png')) return { bg: 'bg-amber-500/10 border border-amber-500/30', text: 'text-amber-400', label: 'PNG' };
    if (type.startsWith('image/bmp')) return { bg: 'bg-purple-500/10 border border-purple-500/30', text: 'text-purple-400', label: 'BMP' };
    return { bg: 'bg-zinc-500/10 border border-zinc-500/30', text: 'text-zinc-400', label: 'FILE' };
  };

  useEffect(() => {
    const processed = postProcessText(initialText);
    setText(processed);
    setSaveInfo(null);
    if (isHtmlString(processed)) {
      setViewMode('preview');
    } else {
      setViewMode('edit');
    }
  }, [initialText]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  useEffect(() => {
    setLoadingHistory(true);
    const unsubscribe = subscribeToSavedDocuments((docs) => {
      setHistoryDocs(docs);
      setLoadingHistory(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleSaveToFirebase = async () => {
    if (!text.trim()) {
      toast.error('Cannot save empty document');
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveDocument(text);
      setSaveInfo(result);
      if (result.savedToCloud) {
        toast.success(`Successfully saved to Firestore! Document ID: ${result.id}`);
      } else {
        toast.info(`Stored on device! Complete Firebase setup in the workspace to sync.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error occurred while communicating with database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0">
      <div className="flex-1 flex flex-col bg-[#130B2B] rounded-none border-0 shadow-2xl shadow-black/30 overflow-hidden w-full h-full relative min-h-0">
        
        {saveInfo && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300 shrink-0">
            <span className="flex items-center gap-1.5 font-sans font-semibold">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Saved {saveInfo.savedToCloud ? 'to Firestore database' : 'locally (fallback mode)'} at {saveInfo.timestamp.toLocaleTimeString()}
            </span>
            <span className="font-mono text-[10px] bg-emerald-400/10 ml-2 px-2 py-0.5 rounded border border-emerald-400/20 text-emerald-400 select-all">
              ID: {saveInfo.id}
            </span>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden relative min-h-0">
          {/* Main Workspace Area (Textarea or Loaded Files List) */}
          <div className="flex-1 p-3 sm:p-5 bg-transparent overflow-hidden relative group h-full flex flex-col">
            {newFiles.length > 0 ? (
              <div className="w-full h-full bg-[#0C061E]/80 border border-[#7B52FF]/20 rounded-xl p-5 sm:p-7 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#7B52FF]/10">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wider">
                        Loaded Files Queue ({newFiles.length}/{MAX_FILES})
                      </h4>
                    </div>
                    <button 
                      onClick={() => setNewFiles([])}
                      className="text-xs text-rose-400 font-bold bg-[#7B52FF]/5 hover:bg-rose-500/15 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      Clear Queue
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto w-full pt-4">
                    {newFiles.map((file, index) => {
                      const iconInfo = getFileIconInfo(file.type);
                      const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
                      const previewUrl = previews[fileKey];
                      
                      return (
                        <div 
                          key={fileKey}
                          className="p-4 bg-[#130B2B]/90 border border-[#7B52FF]/15 hover:border-[#7B52FF]/35 rounded-xl flex items-center gap-4 transition-all duration-200 shadow-md shadow-black/20"
                        >
                          <div 
                            className={`w-12 h-12 ${iconInfo.bg} ${iconInfo.text} flex items-center justify-center rounded-lg font-mono font-bold text-xs uppercase overflow-hidden shrink-0 cursor-zoom-in`}
                            onClick={() => previewUrl && setSelectedPreview(previewUrl)}
                            title="Click to view preview"
                          >
                            {previewUrl ? (
                              <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                              iconInfo.label
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-[#B5AED7]/60 font-mono mt-0.5">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            className="text-[#B5AED7]/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-2 transition-colors duration-200 cursor-pointer border-none bg-transparent"
                            onClick={() => removeNewFile(index)}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-[#7B52FF]/10 mt-6 shrink-0 flex flex-col gap-3 max-w-2xl mx-auto w-full">
                  <button 
                    onClick={() => onRecognizeNewFiles(newFiles)}
                    className="w-full py-4 bg-gradient-to-r from-[#7B52FF] to-[#926CFF] hover:from-[#6A3DFF] hover:to-[#8356FF] text-white rounded-xl font-sans font-black text-sm tracking-widest uppercase shadow-xl shadow-[#7B52FF]/15 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer border-none"
                  >
                    <span>Start Text Recognition</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] text-center text-[#B5AED7]/40 uppercase tracking-widest leading-none font-semibold">
                    Workspace content will be updated upon completion
                  </p>
                </div>
              </div>
            ) : text.trim().length === 0 ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group min-h-[300px] ${
                  isDragging 
                    ? 'border-[#7B52FF] bg-[#7B52FF]/10 shadow-[0_0_30px_rgba(123,82,255,0.2)]'
                    : 'border-[#7B52FF]/20 bg-[#0A051A]/60 hover:border-[#7B52FF]/40 hover:bg-[#7B52FF]/5'
                }`}
              >
                {/* Visual grid behind it for a high-tech scanner look */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#7B52FF_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Glowing orb accent */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#7B52FF]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#7B52FF]/15 transition-all duration-300" />

                <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto space-y-6">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#7B52FF]/15 to-transparent border border-[#7B52FF]/20 flex items-center justify-center text-[#A689FF] shadow-lg shadow-black/20 group-hover:scale-110 group-hover:border-[#7B52FF]/40 transition-all duration-300">
                    <CloudUpload className="h-10 w-10 animate-pulse text-[#7B52FF]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-sans font-bold text-lg text-white">
                      Load Documents to Begin
                    </h3>
                    <p className="text-sm text-[#B5AED7]/60 leading-relaxed font-sans">
                      Drag and drop your files here, or <span className="text-[#A689FF] font-semibold underline underline-offset-4 decoration-2 hover:text-[#916CFF]">click to browse</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <span className="text-[10px] font-mono leading-none font-bold text-[#A689FF] bg-[#7B52FF]/10 px-2.5 py-1.5 rounded-lg border border-[#7B52FF]/20">
                      PDF
                    </span>
                    <span className="text-[10px] font-mono leading-none font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                      JPG
                    </span>
                    <span className="text-[10px] font-mono leading-none font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                      PNG
                    </span>
                    <span className="text-[10px] font-mono leading-none font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20">
                      BMP
                    </span>
                  </div>

                  <p className="text-[10px] text-[#B5AED7]/40 font-semibold tracking-wider uppercase">
                    Up to 3 files simultaneously
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden gap-3">
                {/* View Mode Toggle Controls */}
                <div className="flex items-center justify-between bg-[#130B2B]/60 p-2 rounded-xl border border-[#7B52FF]/15 shrink-0">
                  <span className="text-[10px] font-sans font-bold text-[#B5AED7]/60 uppercase tracking-widest pl-2">
                    Workspace Mode:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer border-none ${
                        viewMode === 'preview'
                          ? 'bg-[#7B52FF] text-white shadow-md shadow-[#7B52FF]/20'
                          : 'text-[#B5AED7]/70 hover:text-white hover:bg-[#7B52FF]/10'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Rendered Document
                    </button>
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer border-none ${
                        viewMode === 'edit'
                          ? 'bg-[#7B52FF] text-white shadow-md shadow-[#7B52FF]/20'
                          : 'text-[#B5AED7]/70 hover:text-white hover:bg-[#7B52FF]/10'
                      }`}
                    >
                      <Code className="h-3.5 w-3.5" />
                      HTML Code
                    </button>
                  </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-hidden relative">
                  {viewMode === 'preview' ? (
                    <div 
                      className="w-full h-full bg-[#0A051A]/60 border border-[#7B52FF]/10 rounded-xl p-5 sm:p-7 text-white overflow-y-auto font-sans leading-relaxed text-[15px] shadow-inner html-rendered-preview custom-scrollbar"
                      dangerouslySetInnerHTML={{ __html: text || '<p class="text-[#B5AED7]/40 italic">No document content to display</p>' }}
                    />
                  ) : (
                    <textarea
                      className="w-full h-full bg-[#0A051A]/60 border border-[#7B52FF]/10 rounded-xl p-5 sm:p-7 text-white whitespace-pre-wrap overflow-y-auto resize-none outline-none focus:border-[#7B52FF]/40 focus:ring-1 focus:ring-[#7B52FF]/20 transition-all font-sans leading-relaxed text-[15px] shadow-inner custom-scrollbar"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="No text recognized..."
                      style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.01em' }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sliding History Sidebar */}
          {showHistory && (
            <div className="w-80 border-l border-[#7B52FF]/15 bg-[#140C2D]/95 backdrop-blur-md flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-[#7B52FF]/15 flex items-center justify-between bg-[#1A1237]/60">
                <span className="text-xs uppercase tracking-wider font-bold text-[#A689FF] flex items-center gap-1.5 font-sans">
                  <Database className="h-4 w-4 text-[#7B52FF]" />
                  Saved History
                </span>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-[#B5AED7]/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {loadingHistory ? (
                  <div className="text-center py-12 text-[#B5AED7]/50 text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#7B52FF]" />
                    <span>Fetching Firestore records...</span>
                  </div>
                ) : historyDocs.length === 0 ? (
                  <div className="text-center py-12 text-[#B5AED7]/40 text-xs px-4 flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-[#7B52FF]/30 stroke-[1.5]" />
                    <span>No documents saved yet.</span>
                    <span className="text-[10px] text-[#B5AED7]/30 mt-1">Press "Save Document" to persist scanning results.</span>
                  </div>
                ) : (
                  historyDocs.map((docItem) => (
                    <div 
                      key={docItem.id}
                      onClick={() => {
                        setText(docItem.text);
                        if (isHtmlString(docItem.text)) {
                          setViewMode('preview');
                        } else {
                          setViewMode('edit');
                        }
                        toast.success('Loaded document from history!');
                      }}
                      className="p-3.5 bg-[#1A1237]/60 hover:bg-[#22184B] border border-[#7B52FF]/10 hover:border-[#7B52FF]/30 rounded-xl transition-all duration-200 cursor-pointer group text-left relative overflow-hidden flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#A689FF] bg-[#7B52FF]/10 px-1.5 py-0.5 rounded border border-[#7B52FF]/15 select-all">
                          {docItem.id}
                        </span>
                        <span className="text-[10px] text-[#B5AED7]/50">
                          {docItem.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  {docItem.createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-white/95 line-clamp-3 font-sans leading-relaxed break-keep">
                        {docItem.text}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#B5AED7]/40 pt-1 border-t border-[#7B52FF]/5">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${docItem.savedToCloud ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                          {docItem.savedToCloud ? 'Cloud Synced' : 'Local'}
                        </span>
                        <span className="text-[#A689FF] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Load <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Menu Bar - ALWAYS VISIBLE AT THE BOTTOM ("под главный") */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#1A1237]/60 border-t border-[#7B52FF]/15 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
          {/* Reset / Back Button */}
          <div className="flex items-center gap-2">
            <div className="relative group/tooltip">
              <button 
                onClick={() => {
                  setText('');
                  setNewFiles([]);
                  setSaveInfo(null);
                  toast.success('Workspace reset. Ready to scan new files.');
                }}
                className="p-2.5 sm:px-4 sm:py-2 bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:border-rose-500/50 hover:bg-rose-500/20 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm font-sans"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  Reset Scans
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>
          </div>

          {/* Action buttons on the right side */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.bmp"
              onChange={handleFileInput}
            />
            {/* Load File Button */}
            <div className="relative group/tooltip">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 sm:px-4 sm:py-2 bg-[#7B52FF]/10 text-[#A689FF] border border-[#7B52FF]/25 hover:border-[#7B52FF]/50 hover:bg-[#7B52FF]/20 hover:text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm font-sans"
              >
                <CloudUpload className="h-4 w-4" />
                <span className="hidden sm:inline">Load File</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  Load File
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>

            {/* Copy Clipboard Button */}
            <div className="relative group/tooltip">
              <button 
                onClick={handleCopy}
                disabled={!text.trim()}
                className="p-2.5 text-[#B5AED7]/70 hover:text-white hover:bg-[#7B52FF]/15 rounded-xl transition-all duration-200 border border-[#7B52FF]/15 cursor-pointer disabled:opacity-40 disabled:pointer-events-none" 
              >
                <Copy className="h-4.5 w-4.5" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  Copy Text
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>

            {/* History Documentation Button */}
            <div className="relative group/tooltip">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 sm:px-4 sm:py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer border ${
                  showHistory 
                    ? 'bg-[#7B52FF] text-white border-[#7B52FF] shadow-lg shadow-[#7B52FF]/25' 
                    : 'bg-[#130B2B] text-[#B5AED7]/80 border-[#7B52FF]/20 hover:border-[#7B52FF]/40 hover:text-white'
                }`}
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
                {historyDocs.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono leading-none bg-[#7B52FF]/20 text-[#A689FF] rounded-full border border-[#7B52FF]/30">
                    {historyDocs.length}
                  </span>
                )}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  Saved Log
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>

            {/* Save Document Button */}
            <div className="relative group/tooltip">
              <button 
                onClick={handleSaveToFirebase}
                disabled={isSaving || !text.trim()}
                className="p-2.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:from-teal-600 disabled:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 border-none disabled:opacity-40 disabled:pointer-events-none"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveInfo ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{saveInfo ? 'Saved' : 'Save'}</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  {saveInfo ? 'Synced to DB' : 'Save Document'}
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>

            {/* Download Button */}
            <div className="relative group/tooltip">
              <button 
                onClick={handleDownload}
                disabled={!text.trim()}
                className="p-2.5 sm:px-4 sm:py-2 bg-[#7B52FF] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#6836FF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-[#7B52FF]/25 border-none disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="h-4 w-4" /> 
                <span className="hidden sm:inline">Download</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:flex flex-col items-center z-50 animate-in fade-in duration-100 pointer-events-none">
                <div className="bg-[#0C061E]/95 backdrop-blur text-[#B5AED7]/90 text-[10px] font-sans font-bold py-1.5 px-3 rounded-lg border border-[#7B52FF]/40 whitespace-nowrap shadow-xl shadow-black/60 uppercase tracking-widest leading-none">
                  Download text
                </div>
                <div className="w-1.5 h-1.5 bg-[#0C061E] border-r border-b border-[#7B52FF]/40 rotate-45 -mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen-filling Modal for Image Preview */}
      {selectedPreview && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setSelectedPreview(null)}
        >
          <img 
            src={selectedPreview} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg" 
          />
          <button 
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 backdrop-blur transition-colors cursor-pointer border-none"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPreview(null);
            }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
