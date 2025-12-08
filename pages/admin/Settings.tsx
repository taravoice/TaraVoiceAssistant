import React, { useState } from 'react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { ShieldCheck, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { changePassword } = useSite();
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
    alert("Password updated successfully! You can now use this password to log in.");
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your admin account credentials.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-lg">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
           <ShieldCheck className="w-6 h-6 mr-2 text-[#0097b2]" />
           Change Admin Password
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
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
         <h3 className="font-bold text-slate-800 mb-2">Note on Security</h3>
         <p className="text-sm text-slate-600">
            This password is saved in your browser's local storage. If you clear your browser cache or use a different device, the password will reset to the default: <strong>987654321</strong>.
         </p>
      </div>
    </div>
  );
};

export default Settings;
