
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

  // Reset local state when modal toggles
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
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e: any) {
        alert("Upload error: " + (e.message || "Unknown error"));
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-down">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Media Library</h2>
            <p className="text-sm text-slate-500">Select an image to map to the placeholder.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Main Library Area */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-semibold text-slate-700 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" /> All Images
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
                    className="flex items-center bg-white"
                    disabled={isUploading}
                 >
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isUploading ? 'Syncing...' : 'Add New File'}
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
                   className={`group cursor-pointer relative aspect-square rounded-lg overflow-hidden border-4 transition-all bg-white ${
                     isSelected ? 'border-[#0097b2] ring-4 ring-[#0097b2]/20 shadow-lg' : 'border-transparent hover:border-slate-300'
                   }`}
                 >
                   <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                   {isSelected && (
                     <div className="absolute inset-0 bg-[#0097b2]/10 flex items-center justify-center">
                        <div className="bg-[#0097b2] text-white rounded-full p-2 shadow-xl animate-fade-in-down">
                          <Check className="w-6 h-6" />
                        </div>
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center">
           <div className="text-sm font-medium text-slate-500 italic">
              {selectedUrl ? <span className="text-[#0097b2] font-bold">1 image selected</span> : 'Select a file to continue'}
           </div>
           <div className="flex space-x-3">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button 
               onClick={handleConfirmSelection} 
               disabled={!selectedUrl}
               className={!selectedUrl ? 'bg-slate-300' : ''}
             >
               Use Selected Image
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
