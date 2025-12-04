import React, { useState } from 'react';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSite } from '../../context/SiteContext';

// Mock Library Images
const libraryImages = [
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

const imageSlots = [
  { key: 'homeHeroBg', page: 'Home', section: 'Hero Background' },
  { key: 'homeIndustry1', page: 'Home', section: 'Industries - Image 1' },
  { key: 'homeIndustry2', page: 'Home', section: 'Industries - Image 2' },
  { key: 'feature1', page: 'Features', section: 'Appointment Booking' },
  { key: 'feature2', page: 'Features', section: 'Dynamic Routing' },
  { key: 'feature3', page: 'Features', section: 'Customer Support' },
  { key: 'feature4', page: 'Features', section: 'Calendar Sync' },
  { key: 'feature5', page: 'Features', section: 'Analytics' },
  { key: 'feature6', page: 'Features', section: 'Conversational Engine' },
];

const MediaManager: React.FC = () => {
  const { content, updateImage } = useSite();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleOpenGallery = (key: string) => {
    setSelectedSlot(key);
    setIsGalleryOpen(true);
  };

  const handleSelectImage = (url: string) => {
    if (selectedSlot) {
      updateImage(selectedSlot, url);
      setIsGalleryOpen(false);
      setSelectedSlot(null);
    }
  };

  const handleUpload = () => {
    alert("In a real app, this would open a file picker. For now, select from the library below.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Media Manager</h1>
        <p className="text-slate-500">Manage and replace images used across your website.</p>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
           <div className="col-span-3">Upload Date</div>
           <div className="col-span-6">Page & Section</div>
           <div className="col-span-3">Preview</div>
        </div>
        
        <div className="divide-y divide-slate-100">
           {imageSlots.map((slot) => {
             const currentUrl = content.images[slot.key];
             return (
               <div key={slot.key} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                 <div className="col-span-3 text-sm text-slate-500">
                   {/* Mock date for now */}
                   Oct 24, 2023
                 </div>
                 <div className="col-span-6">
                   <div className="font-medium text-slate-900">{slot.page}</div>
                   <div className="text-sm text-slate-500">{slot.section}</div>
                 </div>
                 <div className="col-span-3">
                   <div 
                     onClick={() => handleOpenGallery(slot.key)}
                     className="relative group w-24 h-16 bg-slate-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#0097b2]"
                   >
                     <img src={currentUrl} alt={slot.section} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-xs text-white font-medium">Replace</span>
                     </div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Select Image</h2>
              <button onClick={() => setIsGalleryOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                     onClick={() => handleSelectImage(url)}
                     className="group cursor-pointer relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0097b2] transition-all"
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
               <Button variant="ghost" onClick={() => setIsGalleryOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaManager;
