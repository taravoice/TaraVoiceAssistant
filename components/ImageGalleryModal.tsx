import React from 'react';
import { X, Check, Upload } from 'lucide-react';
import { Button } from './Button';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

// Mock Library Images
const libraryImages = [
  '/logo.png',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=2069&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
];

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const handleUpload = () => {
    alert("In a real app, this would open a file picker to upload a new image.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Select Image</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-semibold text-slate-700">Media Library</h3>
             <Button onClick={handleUpload} size="sm" variant="outline" className="flex items-center">
                <Upload className="w-4 h-4 mr-2" /> Upload New
             </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {libraryImages.map((url, idx) => (
               <div 
                 key={idx}
                 onClick={() => onSelect(url)}
                 className="group cursor-pointer relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0097b2] transition-all bg-slate-100"
               >
                 <img src={url} alt={`Library ${idx}`} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-[#0097b2]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white p-2 rounded-full shadow-lg text-[#0097b2]">
                       <Check className="w-5 h-5" />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
           <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};
