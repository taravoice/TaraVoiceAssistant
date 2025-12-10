
import React, { useRef, useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { Upload, Trash2, Copy, AlertCircle, Loader2, Wrench, CheckCircle2 } from 'lucide-react';
import { storage } from '../../firebase';
import { ref, listAll, updateMetadata, getMetadata } from 'firebase/storage';

const Gallery: React.FC = () => {
  const { content, uploadToGallery, removeFromGallery, isStorageConfigured } = useSite();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await uploadToGallery(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error: any) {
        console.error("Upload Error Details:", error);
        if (error.code === 'storage/unauthorized') {
            alert("Permission Denied: Check your Firebase Storage Rules.");
        } else if (error.code === 'storage/object-not-found') {
            alert("Bucket Not Found: Check the Bucket Name in Vercel.");
        } else {
            alert("Upload Failed: " + error.message);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSmartRepair = async () => {
    if (!storage || !isStorageConfigured) return;
    if (!confirm("This will scan all images in your gallery and fix missing metadata (Content-Type and Cache-Control). Continue?")) return;

    setIsRepairing(true);
    setRepairStatus("Scanning files...");
    let fixedCount = 0;
    let errorCount = 0;

    try {
       const galleryRef = ref(storage, 'gallery/');
       const res = await listAll(galleryRef);
       
       for (const itemRef of res.items) {
          try {
             // 1. Get current metadata
             const meta = await getMetadata(itemRef);
             
             // 2. Determine correct content type based on name
             const name = itemRef.name.toLowerCase();
             let contentType = meta.contentType;
             
             if (!contentType || contentType === 'application/octet-stream') {
                if (name.endsWith('.png')) contentType = 'image/png';
                else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) contentType = 'image/jpeg';
                else if (name.endsWith('.svg')) contentType = 'image/svg+xml';
                else if (name.endsWith('.webp')) contentType = 'image/webp';
             }

             // 3. Check if repair is needed
             const needsTypeFix = meta.contentType !== contentType;
             const needsCacheFix = !meta.cacheControl;

             if (needsTypeFix || needsCacheFix) {
                setRepairStatus(`Fixing ${itemRef.name}...`);
                await updateMetadata(itemRef, {
                   contentType: contentType || 'image/jpeg',
                   cacheControl: 'public, max-age=31536000',
                   customMetadata: {
                      ...meta.customMetadata,
                      repairedAt: new Date().toISOString()
                   }
                });
                fixedCount++;
             }
          } catch (e) {
             console.error(`Failed to fix ${itemRef.name}`, e);
             errorCount++;
          }
       }
       setRepairStatus(`Done! Fixed ${fixedCount} files. (${errorCount} errors)`);
    } catch (e: any) {
       setRepairStatus(`Error: ${e.message}`);
    } finally {
       setIsRepairing(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Image URL copied to clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Media Gallery</h1>
          <p className="text-slate-500">Upload and manage all your website images.</p>
        </div>
        <div className="flex space-x-3">
          {/* Repair Button - Always visible now, just disabled if not configured */}
           <Button 
             variant="outline" 
             onClick={handleSmartRepair} 
             disabled={isRepairing || !isStorageConfigured}
             className="border-amber-200 text-amber-700 hover:bg-amber-50"
             title={!isStorageConfigured ? "Storage not connected" : "Fix missing metadata"}
           >
             {isRepairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
             {isRepairing ? 'Repairing...' : 'Run Smart Repair'}
           </Button>

          {/* Upload Button */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} size="lg" className="flex items-center" disabled={isUploading || !isStorageConfigured}>
            {isUploading ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...
                </>
            ) : (
                <>
                    <Upload className="w-5 h-5 mr-2" /> Upload Image
                </>
            )}
          </Button>
        </div>
      </div>

      {repairStatus && (
         <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center animate-fade-in-down">
            {isRepairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {repairStatus}
         </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {content.gallery.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No images uploaded yet.</p>
            <p className="text-slate-400 text-sm mt-2">If you have keys configured, try uploading now.</p>
            {isStorageConfigured && (
              <button onClick={handleUploadClick} className="text-[#0097b2] font-semibold mt-2 hover:underline">
                Upload your first image
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {content.gallery.map((url, idx) => (
              <div key={idx} className="group relative bg-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square">
                  <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                </div>
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button 
                    onClick={() => copyToClipboard(url)}
                    className="p-2 bg-white rounded-full text-slate-700 hover:text-[#0097b2] transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  {isStorageConfigured && (
                    <button 
                      onClick={() => removeFromGallery(url)}
                      className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
