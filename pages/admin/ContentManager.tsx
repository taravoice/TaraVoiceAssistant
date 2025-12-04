import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { Plus, Trash2, Save } from 'lucide-react';

const ContentManager: React.FC = () => {
  const { content, updateHomeContent, addCustomSection, removeCustomSection } = useSite();
  const [newSection, setNewSection] = useState({ title: '', content: '' });

  const handleAddSection = () => {
    if (!newSection.title) return;
    addCustomSection({
      id: Date.now().toString(),
      title: newSection.title,
      content: newSection.content,
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000" // Default placeholder
    });
    setNewSection({ title: '', content: '' });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Content Editor</h1>
        <p className="text-slate-500">Edit the text and sections of your homepage.</p>
      </div>

      {/* Hero Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Hero Section</h2>
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
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">About Section</h2>
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
           <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{content.home.customSections.length} Active</span>
        </div>

        {/* List Existing Custom Sections */}
        <div className="space-y-4 mb-8">
          {content.home.customSections.map((section) => (
            <div key={section.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
               <div>
                 <h3 className="font-bold text-slate-900">{section.title}</h3>
                 <p className="text-sm text-slate-600 line-clamp-2">{section.content}</p>
               </div>
               <button 
                 onClick={() => removeCustomSection(section.id)}
                 className="text-red-500 hover:text-red-700 p-2"
                 title="Delete Section"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
            </div>
          ))}
          {content.home.customSections.length === 0 && (
            <p className="text-slate-400 text-center py-4 italic">No custom sections added yet.</p>
          )}
        </div>

        {/* Add New Section Form */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 border-dashed">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add New Section
          </h3>
          <div className="space-y-4">
             <div>
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
               <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
               <textarea 
                 rows={3}
                 value={newSection.content}
                 onChange={(e) => setNewSection({...newSection, content: e.target.value})}
                 className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                 placeholder="Enter the section details..."
               />
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
    </div>
  );
};

export default ContentManager;
