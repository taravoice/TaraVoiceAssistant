import React from 'react';
import { Target, Lightbulb, Users, Zap } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="bg-[#d9d9d9]">
      {/* Header */}
      <div className="bg-[#d9d9d9] py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">About Us</h1>
          <p className="mt-4 text-xl text-slate-600">Building the future of business communication.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
        
        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-12">
           <div className="bg-[#0097b2]/10 p-8 rounded-2xl border border-[#0097b2]/20">
              <div className="flex items-center space-x-3 mb-4">
                 <Lightbulb className="w-8 h-8 text-[#0097b2]" />
                 <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
              </div>
              <p className="text-slate-700 leading-relaxed">
                To create a world where businesses can focus on their craft while AI seamlessly handles administrative burdens, ensuring every customer feels heard and valued instantly.
              </p>
           </div>
           <div className="bg-white p-8 rounded-2xl border border-slate-200">
              <div className="flex items-center space-x-3 mb-4">
                 <Target className="w-8 h-8 text-[#0097b2]" />
                 <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
              </div>
              <p className="text-slate-700 leading-relaxed">
                 We aim to revolutionize customer engagement through innovative, scalable automation that reduces costs, saves time, and enhances customer satisfaction for SMBs everywhere.
              </p>
           </div>
        </div>

        {/* Why We Built Tara */}
        <div className="flex flex-col md:flex-row items-center gap-12">
           <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop" 
                alt="Team working" 
                className="rounded-2xl shadow-lg"
              />
           </div>
           <div className="md:w-1/2 space-y-4">
              <h2 className="text-3xl font-bold text-slate-900">Why We Built Tara</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                We noticed that small businesses were losing valuable leads simply because they couldn't answer the phone. Receptionists are expensive, and voicemail is often ignored. Tara was built to bridge this gap—providing an affordable, intelligent, and reliable voice interface for businesses that want to grow.
              </p>
           </div>
        </div>

        {/* Who We Help */}
        <div className="bg-slate-900 text-white rounded-3xl p-10 md:p-16 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2] rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
           <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                 <Users className="w-8 h-8 text-[#0097b2]" />
                 <h2 className="text-3xl font-bold">Who We Help</h2>
              </div>
              <p className="text-lg text-slate-300 max-w-3xl leading-relaxed mb-8">
                 We serve hardworking business owners in healthcare, home services, beauty, and wellness who need to manage appointments without being tied to the phone. Whether you are a solo practitioner or run a busy clinic, Tara scales with you.
              </p>
           </div>
        </div>

        {/* The Future */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
           <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop" 
                alt="AI Future" 
                className="rounded-2xl shadow-lg"
              />
           </div>
           <div className="md:w-1/2 space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                 <Zap className="w-6 h-6 text-[#0097b2]" />
                 <h2 className="text-3xl font-bold text-slate-900">The Future of AI Phone Assistants</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed">
                Voice AI is just the beginning. We are constantly evolving Tara to understand deeper context, handle complex negotiations, and integrate with even more business tools. The future is proactive, not just reactive.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default About;
