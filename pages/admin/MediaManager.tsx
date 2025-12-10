
import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { ImageGalleryModal } from '../../components/ImageGalleryModal';
import { Info, AlertTriangle, ImageOff } from 'lucide-react';

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
  { key: 'aboutTeam', page: 'About', section: 'Team Image' },
  { key: 'aboutFuture', page: 'About', section: 'Future Section Image' },
];

const MediaManager: React.FC = () => {
  const { content, updateImage, isStorageConfigured } = useSite();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleOpenGallery = (key: string) => {
    setSelectedSlot(key);
    setIsGalleryOpen(true);
  };

  const handleSelectImage = async (url: string) => {
    if (selectedSlot) {
      setIsGalleryOpen(false);
      await updateImage(selectedSlot, url);
      setSelectedSlot(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Media Manager</h1>
           <p className="text-slate-500 italic">Map images to website sections.</p>
        </div>
      </div>

      {!isStorageConfigured && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start text-red-800 shadow-sm">
          <AlertTriangle className="w-6 h-6 mr-3 shrink-0" />
          <div>
            <p className="font-bold">Cloud Storage Not Connected</p>
            <p className="text-sm mt-1">
              Changes you make here will only be saved to your current browser (Local Storage). 
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#0097b2]/5 p-4 rounded-xl border border-[#0097b2]/20 text-slate-800 flex items-start shadow-sm">
        <Info className="w-5 h-5 mr-3 mt-0.5 shrink-0 text-[#0097b2]" />
        <p className="text-sm leading-relaxed">
          <strong>Draft Mode:</strong> Selecting an image here updates your local preview instantly. 
          Use the <strong>"Publish Live"</strong> button at the top of the page to push these changes to the live website.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
           <div className="col-span-3">Status</div>
           <div className="col-span-6">Location Placeholder</div>
           <div className="col-span-3">Active Mapping</div>
        </div>
        
        <div className="divide-y divide-slate-100">
           {imageSlots.map((slot) => {
             const currentUrl = content.images[slot.key];
             return (
               <div key={slot.key} className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50 transition-colors">
                 <div className="col-span-3 flex items-center space-x-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${isStorageConfigured ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                   <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                     {isStorageConfigured ? 'Active' : 'Local Only'}
                   </span>
                 </div>
                 <div className="col-span-6">
                   <div className="font-bold text-slate-900">{slot.page}</div>
                   <div className="text-sm text-slate-500">{slot.section}</div>
                 </div>
                 <div className="col-span-3">
                   <div 
                     onClick={() => handleOpenGallery(slot.key)}
                     className="relative aspect-[3/2] bg-slate-100 rounded-xl overflow-hidden cursor-pointer border-2 border-slate-200 hover:border-[#0097b2] transition-all flex items-center justify-center"
                   >
                     {currentUrl ? (
                       <img src={currentUrl} alt={slot.section} className="w-full h-full object-contain p-2" />
                     ) : (
                       <div className="text-center p-2">
                         <ImageOff className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                         <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Empty</span>
                       </div>
                     )}
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
