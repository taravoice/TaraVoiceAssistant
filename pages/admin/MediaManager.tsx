
import React from 'react';
import { useSite } from '../../context/SiteContext';
import { FolderGit2, AlertCircle, FileImage, CheckCircle2, XCircle } from 'lucide-react';

const MediaManager: React.FC = () => {
  const { content } = useSite();

  const mappings = [
    { section: "Website Logo", filename: "logo.png", path: "/logo.png" },
    { section: "Hero Background", filename: "home_hero.png", path: "/images/home_hero.png" },
    { section: "Industry 1", filename: "industry_1.png", path: "/images/industry_1.png" },
    { section: "Industry 2", filename: "industry_2.png", path: "/images/industry_2.png" },
    { section: "Feature: Booking", filename: "feature_1.png", path: "/images/feature_1.png" },
    { section: "Feature: Routing", filename: "feature_2.png", path: "/images/feature_2.png" },
    { section: "Feature: Support", filename: "feature_3.png", path: "/images/feature_3.png" },
    { section: "Feature: Sync", filename: "feature_4.png", path: "/images/feature_4.png" },
    { section: "Feature: Analytics", filename: "feature_5.png", path: "/images/feature_5.png" },
    { section: "Feature: Voice", filename: "feature_6.png", path: "/images/feature_6.png" },
    { section: "About: Team", filename: "about_team.png", path: "/images/about_team.png" },
    { section: "About: Future", filename: "about_future.png", path: "/images/about_future.png" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 flex items-center">
             <FolderGit2 className="w-8 h-8 mr-3 text-[#0097b2]" />
             Static Media Manager
           </h1>
           <p className="text-slate-500 text-lg mt-2">
             Images are now managed directly via GitHub files to ensure perfect synchronization across all devices.
           </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
           <h3 className="font-bold text-blue-900 mb-2 flex items-center">
             <AlertCircle className="w-5 h-5 mr-2" />
             How to Update Images
           </h3>
           <ol className="list-decimal list-inside space-y-2 text-blue-800">
             <li>Create a folder named <strong>images</strong> inside the <strong>public</strong> folder of your GitHub repository.</li>
             <li>Name your image files exactly as shown in the table below (must be <strong>.png</strong>).</li>
             <li>Upload/Push the files to GitHub.</li>
             <li>Vercel will automatically redeploy, and images will update instantly for everyone.</li>
           </ol>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
           <div className="col-span-4">Section</div>
           <div className="col-span-4">Required Filename</div>
           <div className="col-span-4">Current Status</div>
        </div>
        
        <div className="divide-y divide-slate-100">
           {mappings.map((item, idx) => (
             <div key={idx} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
               <div className="col-span-4 font-medium text-slate-900">
                 {item.section}
               </div>
               <div className="col-span-4 font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                 {item.filename}
               </div>
               <div className="col-span-4">
                  {/* We try to display the image. If it fails, we show 'Missing' */}
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-20 bg-slate-200 rounded border border-slate-300 overflow-hidden relative">
                       <img 
                         src={item.path} 
                         alt={item.filename}
                         className="w-full h-full object-cover"
                         onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-red-500 font-bold">MISSING</span>';
                         }}
                       />
                    </div>
                    <span className="text-xs text-slate-400">{item.path}</span>
                  </div>
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default MediaManager;
