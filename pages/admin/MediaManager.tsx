
import React from 'react';
import { useSite } from '../../context/SiteContext';
import { FolderGit2, AlertCircle } from 'lucide-react';
import { MediaRenderer } from '../../components/MediaRenderer';

const MediaManager: React.FC = () => {
  // Use a hardcoded list of mappings matching SiteContext defaults.
  // Note: To use an .mp4, you must upload a file named exactly like the mapping (e.g. 'home_hero.png')
  // OR the code in SiteContext must be updated to point to .mp4.
  // For now, this instructions guide users to replace files.
  const mappings = [
    { section: "Website Logo", filename: "logo.png", path: "/logo.png" },
    { section: "Hero Background", filename: "home_hero.png (or .mp4)", path: "/images/home_hero.png" },
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
             Images are now managed directly via GitHub files to ensure perfect synchronization.
           </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
           <h3 className="font-bold text-blue-900 mb-2 flex items-center">
             <AlertCircle className="w-5 h-5 mr-2" />
             How to Update Media
           </h3>
           <ol className="list-decimal list-inside space-y-2 text-blue-800">
             <li>Create a folder named <strong>images</strong> inside the <strong>public</strong> folder of your GitHub repository.</li>
             <li>Name your files exactly as shown below.</li>
             <li>Supported formats: <strong>.png</strong>, <strong>.jpg</strong>, <strong>.gif</strong> (animated), and <strong>.mp4</strong> (video).</li>
             <li><em>Note: If you want to use a video (.mp4) for a slot mapped to .png, you must update the file path in the source code (SiteContext.tsx).</em></li>
             <li>Upload/Push the files to GitHub. Vercel will redeploy automatically.</li>
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
                  {/* We try to display the image/video. If it fails, we show 'Missing' */}
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-20 bg-slate-200 rounded border border-slate-300 overflow-hidden relative flex items-center justify-center">
                        <MediaRenderer 
                           src={item.path} 
                           alt={item.filename}
                           className="w-full h-full object-cover"
                           videoClassName="w-full h-full object-cover"
                        />
                         {/* This simple onError handler approach is tricky with a Component. 
                             Ideally, MediaRenderer handles errors, but for this simple preview, 
                             if the image is broken, it just shows broken icon. 
                         */}
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
