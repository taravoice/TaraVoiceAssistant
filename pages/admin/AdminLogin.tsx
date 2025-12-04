import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { Lock } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useSite();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock authentication
    if (email === 'admin@taravoiceassistant.com' && password === 'admin') {
      login();
      navigate('/admin/dashboard');
    } else {
      alert('Invalid credentials. Try admin@taravoiceassistant.com / admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#0097b2]/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#0097b2]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="text-slate-500 mt-2">Sign in to manage your website</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none"
              placeholder="admin@taravoiceassistant.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
          <Button fullWidth size="lg">Sign In</Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
