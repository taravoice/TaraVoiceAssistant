
import React from 'react';
import { FolderGit2 } from 'lucide-react';

const Gallery: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-20 text-center">
      <div className="bg-slate-50 p-10 rounded-2xl border-2 border-dashed border-slate-300 inline-block">
        <FolderGit2 className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Gallery is Disabled</h1>
        <p className="text-slate-500 max-w-md mx-auto">
          We have switched to <strong>Static File Management</strong>. 
          Please manage your images by uploading them directly to the 
          <code className="bg-slate-200 px-2 py-1 rounded mx-1 text-sm">public/images</code> 
          folder in your GitHub repository.
        </p>
      </div>
    </div>
  );
};

export default Gallery;
