import React, { useState } from 'react';
import { useSite, CustomSection } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { ImageGalleryModal } from '../../components/ImageGalleryModal';

const ContentManager: React.FC = () => {
  const { content, updateHomeContent, addCustomSection, removeCustomSection } = useSite();
  const [newSection, setNewSection] = useState<{ title: string; content: string; image: string; page: string }>({ 
    title: '', 
    content: '',
    image: '',
    page: 'Home' 
  });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const handleAddSection = () => {
    if (!newSection.title) return;
    addCustomSection({
      id: Date.now().toString(),
      title: newSection.title,
      content: newSection.content,
      image: newSection.image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000",
      page: newSection.page
    });
    setNewSection({ title: '', content: '', image: '', page: 'Home' });
  };

  const handleImageSelect = (url: string) => {
    setNewSection({ ...newSection, image: url });
    setIsGalleryOpen(false);
  };

  const pages = ['Home', 'About', 'Features', 'Pricing', 'Contact'];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Content Editor</h1>
        <p className="text-slate-500">Edit text and manage custom sections across the site.</p>
      </div>

      {/* Hero Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Hero Section (Home)</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Title</label>
            <input 
              type="text" 
              value={content.home.heroTitle}
              onChange={(e) => updateHomeContent('heroTitle', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Subtitle</label>
            <textarea 
              rows={3}
              value={content.home.heroSubtitle}
              onChange={(e) => updateHomeContent('heroSubtitle', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">About Section (Home)</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Section Title</label>
            <input 
              type="text" 
              value={content.home.aboutTitle}
              onChange={(e) => updateHomeContent('aboutTitle', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description Text</label>
            <textarea 
              rows={5}
              value={content.home.aboutText}
              onChange={(e) => updateHomeContent('aboutText', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Custom Sections */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
           <h2 className="text-xl font-bold text-slate-900">Additional Sections</h2>
           <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{content.customSections.length} Active</span>
        </div>

        {/* List Existing Custom Sections */}
        <div className="border rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-12 bg-slate-50 p-3 text-sm font-semibold text-slate-700 border-b border-slate-200">
             <div className="col-span-3">Page</div>
             <div className="col-span-8">Section Title & Content</div>
             <div className="col-span-1 text-right">Action</div>
          </div>
          <div className="divide-y divide-slate-100">
            {content.customSections.map((section) => (
              <div key={section.id} className="grid grid-cols-12 p-4 items-start bg-white hover:bg-slate-50 transition-colors">
                 <div className="col-span-3 text-sm font-medium text-[#0097b2] bg-[#0097b2]/5 inline-flex self-start px-2 py-1 rounded-md w-fit">
                   {section.page}
                 </div>
                 <div className="col-span-8 pr-4">
                   <h3 className="font-bold text-slate-900">{section.title}</h3>
                   <p className="text-sm text-slate-600 line-clamp-2 mt-1">{section.content}</p>
                 </div>
                 <div className="col-span-1 text-right">
                   <button 
                     onClick={() => removeCustomSection(section.id)}
                     className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                     title="Delete Section"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                 </div>
              </div>
            ))}
            {content.customSections.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic bg-white">
                No custom sections added yet.
              </div>
            )}
          </div>
        </div>

        {/* Add New Section Form */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 border-dashed">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add New Section
          </h3>
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                 <input 
                   type="text" 
                   value={newSection.title}
                   onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                   placeholder="e.g., Our New Integration"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Page</label>
                 <select 
                    value={newSection.page}
                    onChange={(e) => setNewSection({...newSection, page: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none bg-white"
                 >
                    {pages.map(page => <option key={page} value={page}>{page}</option>)}
                 </select>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
               <textarea 
                 rows={3}
                 value={newSection.content}
                 onChange={(e) => setNewSection({...newSection, content: e.target.value})}
                 className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                 placeholder="Enter the section details..."
               />
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
                <div className="flex gap-4 items-center">
                   {newSection.image && (
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-200 border border-slate-300">
                         <img src={newSection.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                   )}
                   <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsGalleryOpen(true)}
                      className="flex items-center"
                   >
                      <ImageIcon className="w-4 h-4 mr-2" /> 
                      {newSection.image ? 'Change Image' : 'Select Image from Gallery'}
                   </Button>
                </div>
             </div>

             <Button onClick={handleAddSection} disabled={!newSection.title}>
               Add Section to Website
             </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-6">
         <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-200">
            <Button size="lg" className="flex items-center">
               <Save className="w-5 h-5 mr-2" />
               Changes Saved Locally
            </Button>
         </div>
      </div>

      <ImageGalleryModal 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        onSelect={handleImageSelect} 
      />
    </div>
  );
};

export default ContentManager;
