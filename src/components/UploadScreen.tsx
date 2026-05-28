import React, { useCallback, useRef, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, FileText, FileImage, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { getPdfPreview } from '@/services/ocr';

interface UploadScreenProps {
  files: globalThis.File[];
  setFiles: (files: globalThis.File[]) => void;
  onRecognize: () => void;
}

const MAX_FILES = 3;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/bmp'];

export function UploadScreen({ files, setFiles, onRecognize }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    const generatePreviews = async () => {
      const newPreviews = { ...previews };
      let changed = false;

      for (const file of files) {
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
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processSelectedFiles = (selectedFiles: globalThis.File[]) => {
    let validFiles = Array.from(selectedFiles).filter(file => ALLOWED_TYPES.includes(file.type));
    
    if (validFiles.length !== selectedFiles.length) {
      toast.error('Some files were ignored. Only PDF, JPG, PNG, and BMP are supported.');
    }

    if (files.length + validFiles.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} files simultaneously.`);
      validFiles = validFiles.slice(0, MAX_FILES - files.length);
    }

    if (validFiles.length > 0) {
      setFiles([...files, ...validFiles]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  }, [files]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentCount = files.length;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedFiles = Array.from(files);
    const [moved] = reorderedFiles.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, moved);

    setFiles(reorderedFiles);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, i) => i !== indexToRemove));
  };

  const getFileIconInfo = (type: string) => {
    if (type === 'application/pdf') return { bg: 'bg-rose-500/10 border border-rose-500/30', text: 'text-rose-400', label: 'PDF' };
    if (type.startsWith('image/jpeg')) return { bg: 'bg-emerald-500/10 border border-emerald-500/30', text: 'text-emerald-400', label: 'JPG' };
    if (type.startsWith('image/png')) return { bg: 'bg-amber-500/10 border border-amber-500/30', text: 'text-amber-400', label: 'PNG' };
    if (type.startsWith('image/bmp')) return { bg: 'bg-purple-500/10 border border-purple-500/30', text: 'text-purple-400', label: 'BMP' };
    return { bg: 'bg-zinc-500/10 border border-zinc-500/30', text: 'text-zinc-400', label: 'FILE' };
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-6 p-2">
      <div className="w-full md:w-[320px] flex flex-col gap-6 shrink-0">
        <div
          className="bg-[#130B2B] rounded-2xl border-2 border-dashed border-[#7B52FF]/30 p-8 flex flex-col items-center justify-center gap-4 text-center hover:border-[#7B52FF]/75 hover:bg-[#1A1231] transition-all duration-300 cursor-pointer shadow-lg shadow-black/30 shrink-0 select-none group"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 bg-[#7B52FF]/10 text-[#7B52FF] rounded-xl flex items-center justify-center border border-[#7B52FF]/20 group-hover:scale-105 duration-300 transition-transform shadow-md shadow-[#7B52FF]/5">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <p className="font-heading font-semibold text-white tracking-wide text-sm">Drop files here</p>
            <p className="text-xs text-[#B5AED7]/70 mt-1">PDF, JPEG, PNG, BMP (Max {MAX_FILES})</p>
          </div>
          <Button 
            variant="secondary" 
            className="mt-2 text-xs font-bold rounded-xl bg-[#7B52FF] hover:bg-[#6836FF] text-white shadow-lg shadow-[#7B52FF]/20 px-5 py-2.5 transition-all cursor-pointer border-none"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose Files
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.bmp"
            onChange={handleFileInput}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-transparent rounded-2xl border-0">
        <h3 className="text-xs font-bold text-[#A689FF] uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B52FF] animate-pulse"></span>
          Processing Queue ({currentCount}/{MAX_FILES})
        </h3>
        
        {currentCount > 0 ? (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="files-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 overflow-y-auto pr-1">
                    {files.map((file, index) => {
                      const iconInfo = getFileIconInfo(file.type);
                      const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
                      const previewUrl = previews[fileKey];

                      return (
                        // @ts-expect-error hello-pangea types not updated for React 19
                        <Draggable key={fileKey} draggableId={`${file.name}-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                            >
                              <div 
                                className={`p-4 bg-[#130B2B] border rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${
                                  snapshot.isDragging 
                                  ? 'border-[#7B52FF]/50 shadow-2xl bg-[#1C123D] ring-2 ring-[#7B52FF]/20' 
                                  : 'border-[#7B52FF]/15 hover:border-[#7B52FF]/40 hover:bg-[#1A1231]'
                                }`}
                                onClick={() => previewUrl && setSelectedPreview(previewUrl)}
                              >
                                <div className={`w-11 h-11 ${iconInfo.bg} ${iconInfo.text} flex items-center justify-center rounded-lg font-mono font-bold text-xs uppercase overflow-hidden shrink-0`}>
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
                                  className="text-[#B5AED7]/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-2 transition-colors duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(index);
                                  }}
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Button 
              className="w-full py-4 mt-auto h-auto bg-gradient-to-r from-[#7B52FF] to-[#926CFF] hover:from-[#6A3DFF] hover:to-[#8356FF] text-white rounded-2xl font-heading font-black text-sm tracking-widest uppercase shadow-xl shadow-[#7B52FF]/15 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
              onClick={onRecognize}
            >
              Start Text Recognition <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center border border-[rgba(127,102,255,0.12)] rounded-[20px] bg-white/50 backdrop-blur-[10px] bg-clip-border shadow-[0_0_15px_5px_rgba(127,102,255,0.1)] text-[#B5AED7]/60 text-sm py-12 px-6">
            <div className="w-10 h-10 border-4 border-[#7B52FF]/15 bg-[#130b2b] text-[#7B52FF] rounded-xl flex items-center justify-center mb-3">
              <File className="h-5 w-5 animate-pulse" />
            </div>
            <p className="font-bold font-sans text-[#130b2b]">Queue is empty</p>
            <p className="text-xs text-[#130b2b] mt-1 text-center max-w-xs">Files you upload will appear here ready to process</p>
          </div>
        )}
      </div>

      {/* Screen-filling Modal for Image Preview */}
      {selectedPreview && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setSelectedPreview(null)}
        >
          <img 
            src={selectedPreview} 
            alt="Preview" 
            className="w-full h-full object-contain drop-shadow-2xl" 
          />
          <button 
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur transition-colors"
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
