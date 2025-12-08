
import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { ImageGalleryModal } from '../../components/ImageGalleryModal';
import { Loader2, Info } from 'lucide-react';

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

  const handleSelectImage = async (url: string) => {
    if (selectedSlot) {
      setIsGalleryOpen(false);
      setIsSaving(true);
      
      try {
        await updateImage(selectedSlot, url);
        // Ensure user sees the mapping completed
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        alert("Sync failed. Check connection.");
      } finally {
        setIsSaving(false);
        setSelectedSlot(null);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Media Manager</h1>
           <p className="text-slate-500 italic">Authoritative Image Mapping Source of Truth (Syncs to Cloud).</p>
        </div>
        {isSaving && (
           <div className="flex items-center text-[#0097b2] font-semibold bg-[#0097b2]/10 px-6 py-3 rounded-full shadow-sm animate-pulse">
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Broadcasting Config...
           </div>
        )}
      </div>

      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 flex items-start">
        <Info className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
        <p className="text-sm leading-relaxed">
          Select an image from the gallery to map it to a specific website slot. 
          Changes are saved to <strong>site_config.json</strong> in your Firebase Storage and broadcasted to all visitors instantly.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
           <div className="col-span-3">Sync Status</div>
           <div className="col-span-6">UI Placeholder Location</div>
           <div className="col-span-3">Live Image Mapping</div>
        </div>
        
        <div className="divide-y divide-slate-100">
           {imageSlots.map((slot) => {
             const currentUrl = content.images[slot.key];
             return (
               <div key={slot.key} className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50 transition-colors group">
                 <div className="col-span-3 flex items-center space-x-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200 animate-pulse"></div>
                   <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">In Sync</span>
                 </div>
                 <div className="col-span-6">
                   <div className="font-bold text-slate-900">{slot.page}</div>
                   <div className="text-sm text-slate-500">{slot.section}</div>
                 </div>
                 <div className="col-span-3">
                   <div 
                     onClick={() => !isSaving && handleOpenGallery(slot.key)}
                     className={`relative aspect-[3/2] bg-slate-100 rounded-xl overflow-hidden cursor-pointer border-2 border-slate-200 hover:border-[#0097b2] transition-all shadow-inner ${isSaving ? 'opacity-50 grayscale' : ''}`}
                   >
                     <img src={currentUrl} alt={slot.section} className="w-full h-full object-contain p-2" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <span className="text-xs font-bold bg-[#0097b2] px-3 py-1.5 rounded-full shadow-lg">Change Mapping</span>
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
