import React from 'react';
import { UploadCloud, Fingerprint, Dna, FolderInput, ListIcon } from 'lucide-react';

interface DropzoneProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  accept?: string;
  onFileChange?: (fileList: FileList | null) => void;
  fileCount?: number;
  uploaded?: boolean;
}

export function Dropzone({ id, label, icon, accept, onFileChange, fileCount, uploaded }: DropzoneProps) {
  return (
    <div className="relative group">
      <input
        type="file"
        id={id}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={e => onFileChange?.(e.target.files)}
        multiple={id === 'upload-3'}
        accept={accept}
      />
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 group-hover:bg-zinc-800/80 group-hover:border-cyan-500 transition-all duration-300 h-32 text-center">
        <div className="text-zinc-500 group-hover:text-cyan-400 transition-colors mb-3 relative">
          {icon}
          {uploaded && (
            <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold shadow">✓</span>
          )}
          {fileCount && fileCount > 0 && !uploaded && (
            <span className="absolute -top-2 -right-2 bg-cyan-600 text-white rounded-full px-1.5 py-0.5 text-xs font-bold shadow">{fileCount}</span>
          )}
        </div>
        <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-300 max-w-full truncate px-2">
          {label}
        </span>
      </div>
    </div>
  );
}
