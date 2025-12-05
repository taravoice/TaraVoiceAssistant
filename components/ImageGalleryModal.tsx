import React, { useRef, useState } from 'react';
import { X, Check, Upload, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { useSite } from '../context/SiteContext';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { content, uploadToGallery, isStorageConfigured } = useSite();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await uploadToGallery(file);
        // Clear input after success so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e: any) {
        alert("Upload failed: " + (e.message || "Unknown error"));
      } finally {
        setIsUploading(false);
      }
    }
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
             <div>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
               />
               {isStorageConfigured && (
                 <Button 
                    onClick={handleUploadClick} 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center"
                    disabled={isUploading}
                 >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload New'}
                 </Button>
               )}
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {content.gallery.map((url, idx) => (
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
