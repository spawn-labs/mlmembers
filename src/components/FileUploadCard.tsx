import { useCallback, useRef, useState } from 'react';
import type { CSVData } from '../utils/csv';
import { Upload, FileText, CheckCircle2, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileUploadCardProps {
  title: string;
  description: string;
  onUpload: (file: File) => Promise<void>;
  uploadedData: CSVData | null;
  accentColor: 'violet' | 'indigo';
  step: number;
}

export function FileUploadCard({
  title,
  description,
  onUpload,
  uploadedData,
  accentColor,
  step,
}: FileUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a .csv file');
      return;
    }
    setIsLoading(true);
    try {
      await onUpload(file);
    } finally {
      setIsLoading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const colors = {
    violet: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-500/10',
      text: 'text-violet-400',
      hoverBorder: 'hover:border-violet-500/50',
      activeBorder: 'border-violet-500/60',
      dragBg: 'bg-violet-500/20',
      badge: 'bg-violet-500/20 text-violet-300',
    },
    indigo: {
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      hoverBorder: 'hover:border-indigo-500/50',
      activeBorder: 'border-indigo-500/60',
      dragBg: 'bg-indigo-500/20',
      badge: 'bg-indigo-500/20 text-indigo-300',
    },
  }[accentColor];

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative rounded-2xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer',
        uploadedData
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : isDragging
          ? `${colors.activeBorder} ${colors.dragBg}`
          : `${colors.border} bg-white/[0.02] ${colors.hoverBorder}`,
      )}
      onClick={() => !uploadedData && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploadedData ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400">{uploadedData.fileName}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Replace file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-2xl font-bold text-white">{uploadedData.rows.length.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Records</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-2xl font-bold text-white">{uploadedData.headers.length}</p>
              <p className="text-xs text-slate-400">Data Fields</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fields Detected</p>
            <div className="flex flex-wrap gap-1.5">
              {uploadedData.headers.slice(0, 12).map(h => (
                <span key={h} className={cn('rounded px-2 py-0.5 text-xs font-medium', colors.badge)}>
                  {h}
                </span>
              ))}
              {uploadedData.headers.length > 12 && (
                <span className="rounded px-2 py-0.5 text-xs text-slate-500">
                  +{uploadedData.headers.length - 12} more
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-500">
            Step {step}
          </div>
          <div className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-2xl', colors.bg)}>
            {isLoading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-violet-400" />
            ) : (
              <Upload className={cn('h-7 w-7', colors.text)} />
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Drag & drop or click to browse (.csv)</span>
          </div>
        </div>
      )}
    </div>
  );
}
