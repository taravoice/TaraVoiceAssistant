import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
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
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(null);
    }
  }, [isOpen]);

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

  const handleConfirmSelection = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Select Image</h2>
            <p className="text-sm text-slate-500">Choose an image from your library or upload a new one.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-semibold text-slate-700 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" /> Media Library
             </h3>
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
             {content.gallery.map((url, idx) => {
               const isSelected = selectedUrl === url;
               return (
                 <div 
                   key={idx}
                   onClick={() => setSelectedUrl(url)}
                   className={`group cursor-pointer relative aspect-square rounded-lg overflow-hidden border-4 transition-all bg-slate-100 ${
                     isSelected ? 'border-[#0097b2] shadow-lg scale-95' : 'border-transparent hover:border-[#0097b2]/50'
                   }`}
                 >
                   <img src={url} alt={`Library ${idx}`} className="w-full h-full object-cover" />
                   
                   {/* Selection Indicator */}
                   {isSelected && (
                     <div className="absolute top-2 right-2 bg-[#0097b2] text-white rounded-full p-1 shadow-md">
                       <Check className="w-4 h-4" />
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-between items-center">
           <div className="text-sm text-slate-500">
              {selectedUrl ? '1 image selected' : 'No image selected'}
           </div>
           <div className="flex space-x-3">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button 
               onClick={handleConfirmSelection} 
               disabled={!selectedUrl}
               className={!selectedUrl ? 'opacity-50 cursor-not-allowed' : ''}
             >
               Use Selected Image
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
