import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';
import type { Screenshot } from '../../types';
import { fileToBase64, generateId } from '../../utils/helpers';

interface FileUploadProps {
  screenshots: Screenshot[];
  onChange: (screenshots: Screenshot[]) => void;
}

export function FileUpload({ screenshots, onChange }: FileUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newScreenshots: Screenshot[] = await Promise.all(
      acceptedFiles.map(async (file) => ({
        id: generateId(),
        name: file.name,
        data: await fileToBase64(file),
        size: file.size,
        type: file.type,
      }))
    );
    onChange([...screenshots, ...newScreenshots]);
  }, [screenshots, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    multiple: true,
  });

  const remove = (id: string) => onChange(screenshots.filter((s) => s.id !== id));

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 text-slate-400" size={28} />
        <p className="text-sm text-slate-600 font-medium">
          {isDragActive ? 'Drop screenshots here…' : 'Drag & drop screenshots, or click to select'}
        </p>
        <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP supported</p>
      </div>
      {screenshots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {screenshots.map((s) => (
            <div key={s.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              {s.data.startsWith('data:image') ? (
                <img src={s.data} alt={s.name} className="w-full h-28 object-cover" />
              ) : (
                <div className="flex items-center justify-center h-28">
                  <Image size={32} className="text-slate-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              <p className="text-xs text-slate-500 p-1.5 truncate">{s.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
