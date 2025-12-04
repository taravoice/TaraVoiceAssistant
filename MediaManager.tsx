import React, { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/Button';

const MediaManager: React.FC = () => {
  // Mock image database
  const [images, setImages] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop', name: 'hero-bg.jpg' },
    { id: 2, url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop', name: 'industry-healthcare.jpg' },
    { id: 3, url: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=800&auto=format&fit=crop', name: 'industry-salon.jpg' },
  ]);

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this image?')) {
      setImages(images.filter(img => img.id !== id));
    }
  };

  const handleUpload = () => {
    // Mock upload functionality
    alert('In a real backend, this would open the file picker and upload to S3/Cloudinary.');
    const mockImage = {
        id: Date.now(),
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80',
        name: `upload-${Date.now()}.jpg`
    };
    setImages([mockImage, ...images]);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Media Library</h1>
          <p className="text-slate-500">Manage images used across your website.</p>
        </div>
        <Button onClick={handleUpload} className="flex items-center">
           <Upload className="w-5 h-5 mr-2" /> Upload New Image
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img) => (
          <div key={img.id} className="group relative bg-white p-2 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative">
               <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button className="p-2 bg-white rounded-full text-slate-900 hover:text-[#0097b2]" title="View">
                     <ImageIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(img.id)} className="p-2 bg-white rounded-full text-red-500 hover:text-red-700" title="Delete">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
            </div>
            <div className="mt-2 px-1">
               <p className="text-sm font-medium text-slate-700 truncate">{img.name}</p>
               <p className="text-xs text-slate-400">800kb • JPG</p>
            </div>
          </div>
        ))}
        
        {/* Dropzone Placeholder */}
        <div 
            onClick={handleUpload}
            className="border-2 border-dashed border-slate-300 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 hover:border-[#0097b2] hover:text-[#0097b2] hover:bg-[#0097b2]/5 cursor-pointer transition-colors"
        >
            <Upload className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Drop files to upload</span>
        </div>
      </div>
    </div>
  );
};

export default MediaManager;
