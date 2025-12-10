
import React, { useState, useEffect } from 'react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { ShieldCheck, Save, Server, CheckCircle2, XCircle, RefreshCw, CloudLightning, Loader2, ArrowRight } from 'lucide-react';
import { storage, ensureAuth } from '../../firebase';
import { ref, uploadString } from 'firebase/storage';

const Settings: React.FC = () => {
  const { changePassword, isStorageConfigured, forceSync } = useSite();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [envStatus, setEnvStatus] = useState<any>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    // Helper to safely check existence of env vars
    const check = (key: string) => {
       try {
         // @ts-ignore
         return (import.meta.env[key] && import.meta.env[key].length > 0);
       } catch (e) { return false; }
    };

    setEnvStatus({
      apiKey: check('VITE_FIREBASE_API_KEY'),
      authDomain: check('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: check('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: check('VITE_FIREBASE_STORAGE_BUCKET'),
      appId: check('VITE_FIREBASE_APP_ID')
    });
  }, []);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    changePassword(newPassword);
    alert("Password updated successfully!");
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleTestConnection = async () => {
    if (!storage) {
        alert("Cannot test: Storage not configured.");
        return;
    }
    setIsTesting(true);
    try {
        await ensureAuth();
        const testRef = ref(storage, 'permissions_test.txt');
        await uploadString(testRef, `Test OK: ${new Date().toISOString()}`);
        alert("SUCCESS: Write permissions are active! Your app can save data.");
    } catch (e: any) {
        console.error(e);
        if (e.code === 'storage/unauthorized') {
            alert("PERMISSION DENIED: Your keys are correct, but Firebase Storage Rules are blocking uploads. Go to Firebase Console -> Storage -> Rules and allow write access.");
        } else {
            alert(`TEST FAILED: ${e.message}`);
        }
    } finally {
        setIsTesting(false);
    }
  };

  const handleForceSync = async () => {
    if (!confirm("This will overwrite the Cloud configuration with your current Local Browser data. Continue?")) return;
    setIsPushing(true);
    try {
        await forceSync();
        alert("SYNC COMPLETE: Your local data is now live on the cloud. Other browsers should see changes after a refresh.");
    } catch (e: any) {
        alert(`SYNC FAILED: ${e.message}`);
    } finally {
        setIsPushing(false);
    }
  };

  const StatusItem = ({ label, active }: { label: string, active: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
       <span className="text-slate-600 font-medium">{label}</span>
       {active ? (
         <span className="flex items-center text-green-600 text-sm font-bold">
           <CheckCircle2 className="w-4 h-4 mr-1.5" /> Present
         </span>
       ) : (
         <span className="flex items-center text-red-500 text-sm font-bold">
           <XCircle className="w-4 h-4 mr-1.5" /> Missing
         </span>
       )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage account credentials and system configuration.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Password Change */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
             <ShieldCheck className="w-6 h-6 mr-2 text-[#0097b2]" />
             Admin Password
          </h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
               <input 
                 type="password"
                 required
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
                 className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                 placeholder="Enter new password"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
               <input 
                 type="password"
                 required
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                 placeholder="Confirm new password"
               />
            </div>
            <div className="pt-2">
              <Button fullWidth size="lg" className="flex items-center">
                 <Save className="w-5 h-5 mr-2" />
                 Update Password
              </Button>
            </div>
          </form>
        </div>

        {/* System Diagnostics */}
        <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <Server className="w-6 h-6 mr-2 text-[#0097b2]" />
                System Health
            </h2>
            
            <div className={`p-4 rounded-lg mb-6 flex items-start ${isStorageConfigured ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {isStorageConfigured ? (
                    <CheckCircle2 className="w-6 h-6 mr-3 mt-0.5 shrink-0" />
                ) : (
                    <XCircle className="w-6 h-6 mr-3 mt-0.5 shrink-0" />
                )}
                <div>
                    <p className="font-bold text-lg">{isStorageConfigured ? "Connected" : "Disconnected"}</p>
                    <p className="text-sm mt-1 opacity-90">
                        {isStorageConfigured 
                        ? "Your app is successfully connected to the Cloud Database."
                        : "Cloud sync is failing. Check the missing keys below."}
                    </p>
                </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Environment Variables</h3>
                <StatusItem label="VITE_FIREBASE_API_KEY" active={envStatus.apiKey} />
                <StatusItem label="VITE_FIREBASE_PROJECT_ID" active={envStatus.projectId} />
                <StatusItem label="VITE_FIREBASE_STORAGE_BUCKET" active={envStatus.storageBucket} />
                <StatusItem label="VITE_FIREBASE_APP_ID" active={envStatus.appId} />
            </div>
            </div>

            {/* Cloud Sync Tools */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    <CloudLightning className="w-6 h-6 mr-2 text-[#0097b2]" />
                    Cloud Synchronization
                </h2>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Use these tools if changes are not appearing on other browsers.
                    </p>
                    
                    <Button 
                        variant="outline" 
                        fullWidth 
                        onClick={handleTestConnection} 
                        disabled={isTesting || !isStorageConfigured}
                        className="flex items-center justify-center"
                    >
                        {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCw className="w-4 h-4 mr-2"/>}
                        1. Test Write Permissions
                    </Button>

                    <div className="relative">
                        <Button 
                            fullWidth 
                            onClick={handleForceSync}
                            disabled={isPushing || !isStorageConfigured}
                            className={`flex items-center justify-center ${isStorageConfigured ? 'ring-2 ring-offset-2 ring-[#0097b2] shadow-lg' : ''}`}
                        >
                            {isPushing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                            2. Force Push Local Data to Cloud
                        </Button>
                        {isStorageConfigured && !isPushing && (
                           <div className="absolute -right-2 -top-2 w-4 h-4 bg-red-500 rounded-full animate-ping pointer-events-none"></div>
                        )}
                    </div>
                    {isStorageConfigured && (
                       <p className="text-xs text-[#0097b2] font-semibold text-center mt-2 flex items-center justify-center">
                         <ArrowRight className="w-3 h-3 mr-1" /> Recommended next step
                       </p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
