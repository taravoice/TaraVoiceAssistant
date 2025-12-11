
import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { ShieldCheck, Save, Server, CheckCircle2, XCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const { changePassword, isStorageConfigured } = useSite();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
                System Health (Text Content)
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
                        Firebase Storage is used for <strong>Text Content</strong> saving.
                        Images are now handled via GitHub.
                    </p>
                </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
