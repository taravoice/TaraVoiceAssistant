
import React, { useEffect, useState } from 'react';
import { Users, Eye, Activity, Globe, Smartphone, Command, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { storage } from '../../firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!storage) {
        setError("Firebase Storage not configured.");
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. List all log files in the 'analytics/logs' folder
      // In a real production environment with millions of logs, you would use a Cloud Function.
      // For this "Budget" solution, listing ~1000 logs is fine client-side.
      const listRef = ref(storage, 'analytics/logs/');
      const res = await listAll(listRef);
      
      if (res.items.length === 0) {
          setStats(getEmptyStats());
          setLoading(false);
          return;
      }

      // 2. Limit to last 200 logs to ensure dashboard loads fast
      // Sorted roughly by time because Firebase lists alphabetically and we use timestamp filenames
      const recentLogs = res.items.slice(-200); 

      // 3. Download and parse each log file
      const logPromises = recentLogs.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          try {
            const response = await fetch(url);
            return await response.json();
          } catch (e) {
            return null; // Ignore corrupted logs
          }
      });

      const logs = (await Promise.all(logPromises)).filter(l => l !== null);

      // 4. Process logs into Stats
      const aggregated = processLogs(logs);
      setStats(aggregated);

    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      // Fallback: If folder doesn't exist yet, just show empty
      if (err.code === 'storage/object-not-found') {
          setStats(getEmptyStats());
      } else {
          setError(err.message || "Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  };

  const processLogs = (logs: any[]) => {
      let pageViews = logs.length;
      
      // Count Unique Sessions
      const sessions = new Set();
      const countries: Record<string, number> = {};
      const devices: Record<string, number> = {};
      const os: Record<string, number> = {};

      logs.forEach(log => {
          if (log.sessionId) sessions.add(log.sessionId);
          
          // Country
          const c = log.country || 'Unknown';
          countries[c] = (countries[c] || 0) + 1;

          // Device/OS Parsing (Basic)
          const ua = (log.userAgent || '').toLowerCase();
          
          // Device
          let device = 'Desktop';
          if (ua.includes('mobile')) device = 'Mobile';
          else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
          devices[device] = (devices[device] || 0) + 1;

          // OS
          let system = 'Other';
          if (ua.includes('windows')) system = 'Windows';
          else if (ua.includes('mac') && !ua.includes('iphone')) system = 'MacOS';
          else if (ua.includes('android')) system = 'Android';
          else if (ua.includes('iphone') || ua.includes('ipad')) system = 'iOS';
          else if (ua.includes('linux')) system = 'Linux';
          os[system] = (os[system] || 0) + 1;
      });

      const visitors = sessions.size;

      // Calculate percentages for charts
      const formatPie = (obj: Record<string, number>) => {
          const total = Object.values(obj).reduce((a, b) => a + b, 0);
          return Object.entries(obj)
            .map(([name, count]) => ({ name, value: Math.round((count / total) * 100) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 only
      };

      return {
          visitors,
          pageViews,
          bounceRate: "0", 
          countries: formatPie(countries),
          devices: formatPie(devices),
          os: formatPie(os)
      };
  };

  const getEmptyStats = () => ({
      visitors: 0,
      pageViews: 0,
      bounceRate: 0,
      countries: [],
      devices: [],
      os: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getVal = (val: any) => val || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0097b2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500">Real-time data sourced from Firebase Logs.</p>
        </div>
        <button onClick={fetchAnalytics} className="p-2 text-slate-400 hover:text-[#0097b2] transition-colors" title="Refresh Data">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error === "Firebase Storage not configured." 
                ? "Storage not connected. Please add Firebase keys to Vercel Environment Variables."
                : `Error: ${error}`
            }
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WINDOW 1: General Analytics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-[#0097b2]" /> Traffic Overview
           </h2>
           <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Users className="w-4 h-4 mr-1"/> Unique Visitors</div>
                 <div className="text-2xl font-bold text-slate-900">{getVal(stats?.visitors)}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Eye className="w-4 h-4 mr-1"/> Total Page Views</div>
                 <div className="text-2xl font-bold text-slate-900">{getVal(stats?.pageViews)}</div>
              </div>
           </div>
        </div>

        {/* WINDOW 2: Countries */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Globe className="w-5 h-5 mr-2 text-[#0097b2]" /> Top Locations
           </h2>
           {stats?.countries && stats.countries.length > 0 ? (
             <div className="space-y-4 max-h-60 overflow-y-auto">
                {stats.countries.map((country: any, idx: number) => (
                  <div key={idx} className="flex items-center">
                     <span className="text-sm font-bold text-slate-900 w-16 truncate">{country.name}</span>
                     <div className="flex-1 mx-3">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                           <div className="bg-[#0097b2] h-2 rounded-full" style={{ width: `${country.value}%` }}></div>
                        </div>
                     </div>
                     <span className="text-xs text-slate-500">{country.value}%</span>
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 py-8">
                {stats?.pageViews > 0 ? "Parsing location data..." : "Waiting for visitors..."}
             </div>
           )}
        </div>

        {/* WINDOW 3: Devices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Smartphone className="w-5 h-5 mr-2 text-[#0097b2]" /> Devices
           </h2>
           {stats?.devices && stats.devices.length > 0 ? (
             <div className="flex items-center justify-around">
                {stats.devices.map((device: any, idx: number) => (
                   <div key={idx} className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{device.value}%</div>
                      <div className="text-sm text-slate-500">{device.name}</div>
                   </div>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 py-8">Waiting for data...</div>
           )}
        </div>

        {/* WINDOW 4: Operating Systems */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Command className="w-5 h-5 mr-2 text-[#0097b2]" /> Operating Systems
           </h2>
           {stats?.os && stats.os.length > 0 ? (
             <div className="space-y-2">
                {stats.os.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-50 py-2">
                     <span className="text-sm text-slate-700">{item.name}</span>
                     <span className="font-bold text-[#0097b2]">{item.value}%</span>
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 py-8">Waiting for data...</div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
