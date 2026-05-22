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
    if (type === 'application/pdf') return { bg: 'bg-blue-50', text: 'text-blue-600', label: 'PDF' };
    if (type.startsWith('image/jpeg')) return { bg: 'bg-green-50', text: 'text-green-600', label: 'JPG' };
    if (type.startsWith('image/png')) return { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'PNG' };
    if (type.startsWith('image/bmp')) return { bg: 'bg-purple-50', text: 'text-purple-600', label: 'BMP' };
    return { bg: 'bg-slate-50', text: 'text-slate-600', label: 'FILE' };
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-6 p-2">
      <div className="w-full md:w-[320px] flex flex-col gap-6 shrink-0">
        <div
          className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center gap-3 text-center hover:border-indigo-400 transition-colors bg-indigo-50/10 cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Drop files here</p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPEG, PNG, BMP (Max {MAX_FILES})</p>
          </div>
          <Button 
            variant="secondary" 
            className="mt-2 text-sm font-medium rounded-lg shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
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

      <div className="flex-1 flex flex-col min-h-0 bg-transparent rounded-xl border-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
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
                                className={`p-3 bg-white border rounded-lg flex items-center gap-3 cursor-pointer ${
                                  snapshot.isDragging 
                                  ? 'border-indigo-200 shadow-md ring-1 ring-indigo-500 ring-opacity-20' 
                                  : 'border-slate-200 shadow-sm hover:border-indigo-300'
                                }`}
                                onClick={() => previewUrl && setSelectedPreview(previewUrl)}
                              >
                                <div className={`w-10 h-10 ${iconInfo.bg} ${iconInfo.text} flex items-center justify-center rounded font-bold text-xs uppercase overflow-hidden shrink-0`}>
                                  {previewUrl ? (
                                    <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                                  ) : (
                                    iconInfo.label
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="text-slate-300 hover:text-red-500 transition-colors p-2 -mr-2"
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
              className="w-full py-4 mt-auto h-auto bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all" 
              onClick={onRecognize}
            >
              Recognize Text <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-slate-400 italic text-sm">
            No files in queue.
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
