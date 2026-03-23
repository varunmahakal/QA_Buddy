import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Screenshot } from '../../types';

interface ImageLightboxProps {
  screenshots: Screenshot[];
}

export function ImageLightbox({ screenshots }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (screenshots.length === 0) return <p className="text-sm text-slate-400 italic">No screenshots attached</p>;

  const current = screenshots[index];
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : screenshots.length - 1));
  const next = () => setIndex((i) => (i < screenshots.length - 1 ? i + 1 : 0));

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {screenshots.map((s, i) => (
          <div
            key={s.id}
            onClick={() => { setIndex(i); setOpen(true); }}
            className="relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
          >
            <img src={s.data} alt={s.name} className="w-full h-20 object-cover" />
            <p className="text-xs text-slate-500 p-1 truncate bg-white">{s.name}</p>
          </div>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
          {screenshots.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft size={24}/></button>
              <button onClick={next} className="absolute right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20"><ChevronRight size={24}/></button>
            </>
          )}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3">
            <img src={current.data} alt={current.name} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
            <p className="text-white/80 text-sm">{current.name} ({index + 1}/{screenshots.length})</p>
          </div>
        </div>
      )}
    </>
  );
}
