import React, { useEffect, useState } from 'react';
import { Users, Eye, Activity, Globe, Smartphone, Monitor, Command, Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // SIMULATED DATA (Fallback)
  const mockStats = {
    visitors: "2.4k",
    pageViews: "5.1k",
    bounceRate: "42%",
    visitorsTrend: "+12%",
    viewsTrend: "+8%",
    bounceTrend: "-3%"
  };

  const countries = [
    { code: "US", name: "United States", value: 45, flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", value: 15, flag: "🇬🇧" },
    { code: "DE", name: "Germany", value: 12, flag: "🇩🇪" },
    { code: "CA", name: "Canada", value: 8, flag: "🇨🇦" },
    { code: "IN", name: "India", value: 5, flag: "🇮🇳" },
  ];

  const devices = [
    { name: "Mobile", value: 55, icon: Smartphone, color: "bg-[#0097b2]" },
    { name: "Desktop", value: 40, icon: Monitor, color: "bg-purple-500" },
    { name: "Tablet", value: 5, icon: Monitor, color: "bg-amber-500" },
  ];

  const os = [
    { name: "iOS", value: 48, icon: Command },
    { name: "Android", value: 32, icon: Command },
    { name: "Windows", value: 12, icon: Monitor },
    { name: "macOS", value: 8, icon: Command },
  ];

  useEffect(() => {
    const fetchData = async () => {
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
          if (Object.keys(data).length > 0) {
             setStats({ ...mockStats, ...data });
             setUsingMockData(false);
          } else {
             setStats(mockStats);
             setUsingMockData(true);
          }
        } else {
          console.warn("API Error:", data);
          setApiError(data.error || data.message || "Unknown API Error");
          setDebugInfo(data.debug);
          setStats(mockStats);
          setUsingMockData(true);
        }
      } catch (error: any) {
        console.error("Failed to fetch stats", error);
        setApiError(error.message);
        setStats(mockStats);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0097b2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of your website traffic and performance.</p>
        
        {usingMockData && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-col items-start gap-2">
             <div className="flex items-center">
                <Activity className="w-5 h-5 mr-2 shrink-0" />
                <strong>Simulated Data Active</strong>
             </div>
             <p>
               Error: <span className="font-mono bg-amber-100 px-1 rounded font-bold">{apiError}</span>
             </p>
             {debugInfo && (
                <div className="text-xs font-mono bg-white/50 p-2 rounded w-full">
                    <p>Debug Info:</p>
                    <p>Project ID: {debugInfo.projectIdConfigured}</p>
                    <p>Has Team ID: {debugInfo.hasTeamId ? 'Yes' : 'No'}</p>
                </div>
             )}
             <div className="text-xs text-amber-700 space-y-1 mt-2">
               <p>• If error is <code>forbidden</code>: Add <code>VERCEL_TEAM_ID</code> to Env Vars.</p>
               <p>• If error is <code>not_found</code>: Check Project ID match.</p>
               <p>• If error is <code>Local Proxy Error</code>: Restart <code>npm run dev</code>.</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WINDOW 1: General Analytics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-[#0097b2]" /> Traffic Overview (Last 30 Days)
           </h2>
           <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Users className="w-4 h-4 mr-1"/> Visitors</div>
                 <div className="text-2xl font-bold text-slate-900">{stats?.visitors || "0"}</div>
                 <div className="text-xs text-green-600 font-medium">{stats?.visitorsTrend || "0%"}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1 flex justify-center items-center"><Eye className="w-4 h-4 mr-1"/> Views</div>
                 <div className="text-2xl font-bold text-slate-900">{stats?.pageViews || "0"}</div>
                 <div className="text-xs text-green-600 font-medium">{stats?.viewsTrend || "0%"}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                 <div className="text-slate-500 text-sm mb-1">Bounce Rate</div>
                 <div className="text-2xl font-bold text-slate-900">{stats?.bounceRate || "0%"}</div>
                 <div className="text-xs text-green-600 font-medium">{stats?.bounceTrend || "0%"}</div>
              </div>
           </div>
        </div>

        {/* WINDOW 2: Countries */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Globe className="w-5 h-5 mr-2 text-[#0097b2]" /> Top Countries
           </h2>
           <div className="space-y-4">
              {countries.map((country, idx) => (
                <div key={idx} className="flex items-center">
                   <span className="text-2xl mr-3">{country.flag}</span>
                   <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                         <span className="font-medium text-slate-700">{country.name}</span>
                         <span className="text-slate-500">{country.value}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                         <div className="bg-[#0097b2] h-2 rounded-full" style={{ width: `${country.value}%` }}></div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* WINDOW 3: Devices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Smartphone className="w-5 h-5 mr-2 text-[#0097b2]" /> Devices
           </h2>
           <div className="flex items-center justify-around mb-6">
              {devices.map((device, idx) => (
                 <div key={idx} className="text-center">
                    <div className={`w-3 h-3 ${device.color} rounded-full mx-auto mb-2`}></div>
                    <span className="text-sm font-bold text-slate-700">{device.value}%</span>
                    <span className="block text-xs text-slate-500">{device.name}</span>
                 </div>
              ))}
           </div>
           <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
              {devices.map((device, idx) => (
                 <div key={idx} className={`${device.color} h-full`} style={{ width: `${device.value}%` }}></div>
              ))}
           </div>
        </div>

        {/* WINDOW 4: Operating Systems */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
             <Command className="w-5 h-5 mr-2 text-[#0097b2]" /> Operating Systems
           </h2>
           <div className="space-y-4">
              {os.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                   <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-600">
                         <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                   </div>
                   <span className="text-sm font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
