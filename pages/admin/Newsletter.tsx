
import React, { useEffect, useState } from 'react';
import { storage } from '../../firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Mail, Download, Loader2, RefreshCw, Calendar, Copy, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';

interface Subscriber {
  email: string;
  date: string;
  timestamp: number;
  fromFilename?: boolean;
}

const Newsletter: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState('');

  const fetchSubscribers = async () => {
    if (!storage) return;
    setLoading(true);
    setDebugMsg('');
    const fetchedSubs: Subscriber[] = [];

    try {
      const listRef = ref(storage, 'newsletter/');
      const res = await listAll(listRef);
      setDebugMsg(`Found ${res.items.length} files in database.`);
      
      // PARALLEL PROCESSING
      await Promise.all(res.items.map(async (item) => {
        try {
            // STRATEGY 1: Read from Filename (Fastest, No CORS issues)
            // Expected format: email@domain.com___123456789.json
            const name = item.name;
            if (name.includes('___')) {
                const parts = name.split('___');
                const email = parts[0];
                const tsString = parts[1].replace('.json', '');
                const ts = parseInt(tsString);
                
                fetchedSubs.push({
                    email: email,
                    date: new Date(ts).toISOString(),
                    timestamp: ts,
                    fromFilename: true
                });
                return;
            }

            // STRATEGY 2: Legacy File Download (Might fail due to CORS)
            // Only try this if filename format doesn't match
            const url = await getDownloadURL(item);
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                fetchedSubs.push(data);
            }
        } catch (err) {
            console.warn(`Could not read subscriber file: ${item.name}`, err);
        }
      }));

      // Sort by newest first
      const sorted = fetchedSubs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setSubscribers(sorted);
      
      if (res.items.length > 0 && sorted.length === 0) {
          setDebugMsg(`Found ${res.items.length} files but could not read them. Try submitting a new test email.`);
      }

    } catch (e: any) {
      console.error("Failed to list newsletter subs", e);
      setDebugMsg(`Error listing files: ${e.message}`);
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
              <p>No subscribers found.</p>
              {debugMsg && <p className="text-xs text-slate-300 mt-2 font-mono">{debugMsg}</p>}
              <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded mt-4 max-w-md mx-auto text-left">
                 <strong>Note:</strong> We updated the storage system. 
                 <br/>1. Try submitting a <strong>new</strong> test email in the footer.
                 <br/>2. If the new one appears, the system is working!
                 <br/>3. Old entries might be hidden due to browser security (CORS), but they are safe in your Firebase Console.
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Newsletter;
