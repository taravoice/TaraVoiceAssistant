import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { ImageGalleryModal } from '../../components/ImageGalleryModal';
import { Loader2, CheckCircle } from 'lucide-react';

const imageSlots = [
  { key: 'logo', page: 'Global', section: 'Website Logo' },
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
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenGallery = (key: string) => {
    setSelectedSlot(key);
    setIsGalleryOpen(true);
  };

  // This function receives the URL from the Modal when "Use Selected Image" is clicked
  const handleSelectImage = async (url: string) => {
    if (selectedSlot) {
      setIsGalleryOpen(false); // Close first for better UX
      setIsSaving(true);
      
      console.log(`Replacing ${selectedSlot} with ${url}`); // Debug
      await updateImage(selectedSlot, url);
      
      // Small delay to show the saving spinner
      setTimeout(() => {
        setIsSaving(false);
        setSelectedSlot(null);
      }, 800);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Media Manager</h1>
           <p className="text-slate-500">Manage and replace images used across your website.</p>
        </div>
        {isSaving && (
           <div className="flex items-center text-[#0097b2] font-semibold bg-[#0097b2]/10 px-6 py-3 rounded-full shadow-sm animate-pulse">
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Saving Changes...
           </div>
        )}
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
           <div className="col-span-3">Status</div>
           <div className="col-span-6">Page & Section</div>
           <div className="col-span-3">Current Image</div>
        </div>
        
        <div className="divide-y divide-slate-100">
           {imageSlots.map((slot) => {
             const currentUrl = content.images[slot.key];
             return (
               <div key={slot.key} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                 <div className="col-span-3 text-sm text-slate-500 flex items-center">
                   <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                   Active
                 </div>
                 <div className="col-span-6">
                   <div className="font-medium text-slate-900">{slot.page}</div>
                   <div className="text-sm text-slate-500">{slot.section}</div>
                 </div>
                 <div className="col-span-3">
                   <div 
                     onClick={() => !isSaving && handleOpenGallery(slot.key)}
                     className={`relative group w-32 h-20 bg-slate-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#0097b2] ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                     title="Click to Replace"
                   >
                     <img src={currentUrl} alt={slot.section} className="w-full h-full object-contain p-2" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-xs text-white font-bold bg-[#0097b2] px-2 py-1 rounded-full">Replace</span>
                     </div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      <ImageGalleryModal 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={handleSelectImage}
      />
    </div>
  );
};

export default MediaManager;
