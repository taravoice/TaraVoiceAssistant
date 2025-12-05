import React, { useEffect, useState } from 'react';
import { Users, Eye, Activity, Globe, Smartphone, Monitor, Command, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/stats');
      
      // Check for HTML response (common 404/500 issue in SPAs)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
          // If we are local and see HTML, it usually means the proxy failed or isn't set up
          if (window.location.hostname === 'localhost') {
            throw new Error("Local Proxy Error: API returned HTML. Check vite.config.ts.");
          }
          throw new Error("API Endpoint Not Found (404). Function may not be deployed.");
      }

      const data = await res.json();

      if (res.ok && !data.error) {
        console.log("Real Analytics Data Received:", data);
        setStats(data);
      } else {
        console.warn("API Error:", data);
        setApiError(data.error || data.message || "Unknown API Error");
        setDebugInfo(data.debug);
        setStats(null);
      }
    } catch (error: any) {
      console.error("Failed to fetch stats", error);
      setApiError(error.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0097b2] animate-spin" />
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 mr-3 text-red-600" />
            <h2 className="text-xl font-bold">Analytics Connection Failed</h2>
          </div>
          <p className="mb-4">
            The dashboard could not fetch real-time data from Vercel. 
            <br/><span className="text-sm opacity-80">Error: {apiError}</span>
          </p>
          
          {debugInfo && (
            <div className="bg-white/50 p-4 rounded-lg font-mono text-xs mb-4">
              <p><strong>Debug Info:</strong></p>
              <p>Project ID Configured: {debugInfo.projectIdConfigured}</p>
              <p>Has Team ID: {debugInfo.hasTeamId ? 'Yes' : 'No'}</p>
            </div>
          )}

          <div className="text-sm space-y-2 mb-6">
            <p><strong>Troubleshooting:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Ensure <code>VERCEL_API_TOKEN</code> and <code>VERCEL_PROJECT_ID</code> are set in Vercel Environment Variables.</li>
              <li>If you are on a Team, ensure <code>VERCEL_TEAM_ID</code> is also set.</li>
              <li>Make sure "Web Analytics" is enabled in your Vercel Project Dashboard.</li>
            </ul>
          </div>

          <button 
            onClick={fetchData} 
            className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Helper to safely get data or show 0
  const getVal = (val: any) => val || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Real-time overview of your website traffic.</p>
        </div>
        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-[#0097b2] transition-colors" title="Refresh Data">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WINDOW 1: General Analytics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-[#0097b2]" /> Traffic Overview
           </h2>
           <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Users className="w-4 h-4 mr-1"/> Visitors</div>
                 <div className="text-2xl font-bold text-slate-900">{getVal(stats?.visitors)}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Eye className="w-4 h-4 mr-1"/> Views</div>
                 <div className="text-2xl font-bold text-slate-900">{getVal(stats?.pageViews)}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1">Bounce Rate</div>
                 <div className="text-2xl font-bold text-slate-900">{getVal(stats?.bounceRate)}%</div>
              </div>
           </div>
        </div>

        {/* WINDOW 2: Countries */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Globe className="w-5 h-5 mr-2 text-[#0097b2]" /> Top Countries
           </h2>
           {stats?.countries && stats.countries.length > 0 ? (
             <div className="space-y-4">
                {stats.countries.map((country: any, idx: number) => (
                  <div key={idx} className="flex items-center">
                     <span className="text-xl mr-3 w-6">{country.flag || '🏳️'}</span>
                     <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-slate-700">{country.name || country.code}</span>
                           <span className="text-slate-500">{country.value}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                           <div className="bg-[#0097b2] h-2 rounded-full" style={{ width: `${country.value}%` }}></div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 py-8">No country data available yet.</div>
           )}
        </div>

        {/* WINDOW 3: Devices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Smartphone className="w-5 h-5 mr-2 text-[#0097b2]" /> Devices
           </h2>
           {stats?.devices && stats.devices.length > 0 ? (
             <>
               <div className="flex items-center justify-around mb-6">
                  {stats.devices.map((device: any, idx: number) => (
                     <div key={idx} className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2`} style={{ backgroundColor: idx === 0 ? '#0097b2' : '#cbd5e1' }}></div>
                        <span className="text-sm font-bold text-slate-700">{device.value}%</span>
                        <span className="block text-xs text-slate-500">{device.name}</span>
                     </div>
                  ))}
               </div>
               <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  {stats.devices.map((device: any, idx: number) => (
                     <div key={idx} className="h-full" style={{ width: `${device.value}%`, backgroundColor: idx === 0 ? '#0097b2' : '#cbd5e1' }}></div>
                  ))}
               </div>
             </>
           ) : (
             <div className="text-center text-slate-400 py-8">No device data available yet.</div>
           )}
        </div>

        {/* WINDOW 4: Operating Systems */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Command className="w-5 h-5 mr-2 text-[#0097b2]" /> Operating Systems
           </h2>
           {stats?.os && stats.os.length > 0 ? (
             <div className="space-y-4">
                {stats.os.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                     <div className="flex items-center">
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                     </div>
                     <span className="text-sm font-bold text-slate-900">{item.value}%</span>
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 py-8">No OS data available yet.</div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
