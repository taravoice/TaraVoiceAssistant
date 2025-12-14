
import React, { useEffect, useState } from 'react';
import { storage } from '../../firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Mail, Download, Loader2, RefreshCw, Calendar, Copy, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';

interface Subscriber {
  email: string;
  date: string;
  timestamp: number;
}

const Newsletter: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribers = async () => {
    if (!storage) return;
    setLoading(true);
    try {
      const listRef = ref(storage, 'newsletter/');
      const res = await listAll(listRef);
      console.log(`Newsletter: Found ${res.items.length} files.`);
      
      const promises = res.items.map(async (item) => {
        try {
            const url = await getDownloadURL(item);
            // Use no-store to prevent caching of file contents
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) return null;
            const data = await response.json();
            return data as Subscriber;
        } catch (err) {
            console.warn("Skipping corrupt or unreachable subscriber file", err);
            return null;
        }
      });

      const results = await Promise.all(promises);
      // Filter out failed loads
      const validResults = results.filter(r => r !== null) as Subscriber[];
      
      // Sort by newest first
      const sorted = validResults.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setSubscribers(sorted);
    } catch (e) {
      console.error("Failed to load newsletter subs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Email,Date\n" 
      + subscribers.map(s => `${s.email},${new Date(s.date).toLocaleDateString()}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "newsletter_subscribers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmails = () => {
    const emails = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    alert("All emails copied to clipboard!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <Mail className="w-8 h-8 mr-3 text-[#0097b2]" />
            Newsletter Subscribers
          </h1>
          <p className="text-slate-500 text-lg mt-2">
            Manage your email list collected from the website footer.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={fetchSubscribers} className="p-2">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </Button>
           <Button variant="outline" onClick={handleCopyEmails} disabled={subscribers.length === 0}>
              <Copy className="w-4 h-4 mr-2" /> Copy All
           </Button>
           <Button onClick={handleExportCSV} disabled={subscribers.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 p-4 border-b border-slate-200 font-semibold text-slate-700">
           <div className="col-span-8">Email Address</div>
           <div className="col-span-4 text-right">Date Subscribed</div>
        </div>
        
        {loading ? (
           <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading subscribers...
           </div>
        ) : subscribers.length > 0 ? (
           <div className="divide-y divide-slate-100">
              {subscribers.map((sub, idx) => (
                 <div key={idx} className="grid grid-cols-12 p-4 hover:bg-slate-50 transition-colors items-center">
                    <div className="col-span-8 font-medium text-slate-900">
                       {sub.email}
                    </div>
                    <div className="col-span-4 text-right text-slate-500 text-sm flex items-center justify-end">
                       <Calendar className="w-4 h-4 mr-2 opacity-50" />
                       {new Date(sub.date).toLocaleDateString()}
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="p-12 text-center text-slate-400 italic">
              No subscribers found.
              <br/>
              <span className="text-xs">Ensure your Firebase Storage rules allow writes.</span>
           </div>
        )}
      </div>
    </div>
  );
};

export default Newsletter;
