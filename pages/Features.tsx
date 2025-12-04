import React from 'react';
import { Calendar, Network, Headset, RefreshCw, BarChart, Bot } from 'lucide-react';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';

const Features: React.FC = () => {
  const featureList = [
    {
      id: 1,
      title: "AI Appointment Booking",
      desc: "Our core engine connects directly to your schedule. When a client asks for a slot, Tara checks availability in real-time and books it instantly, sending confirmations to both parties.",
      icon: Calendar,
      img: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "Dynamic Call Routing",
      desc: "Not every call is for booking. Tara intelligently detects urgency or specific requests (like billing issues) and can route calls to specific departments or take detailed messages.",
      icon: Network,
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "Real-time Customer Support",
      desc: "Tara is trained on your specific business knowledge base. She answers FAQs about pricing, location, services, and preparation instructions instantly.",
      icon: Headset,
      img: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=2069&auto=format&fit=crop"
    },
    {
      id: 4,
      title: "Calendar (Cal.com) Sync",
      desc: "We prioritize seamless integration. Changes made in your Cal.com calendar are immediately reflected in Tara's availability, preventing double bookings.",
      icon: RefreshCw,
      img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop"
    },
    {
      id: 5,
      title: "Call Analytics & Insights",
      desc: "Gain visibility into your business. Dashboard reports show peak call times, missed opportunities, and common customer questions to help you optimize operations.",
      icon: BarChart,
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop"
    },
    {
      id: 6,
      title: "Human-like Conversational Engine",
      desc: "Utilizing advanced LLMs, Tara speaks with natural pauses, intonation, and understanding, creating a comfortable experience for your callers.",
      icon: Bot,
      img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop"
    }
  ];

  return (
    <div className="bg-[#d9d9d9]">
      <div className="bg-[#d9d9d9] py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Features</h1>
          <p className="mt-4 text-xl text-slate-600">Advanced capabilities to power your front desk.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-24">
          {featureList.map((feature, index) => (
            <div key={feature.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
              <div className="lg:w-1/2 space-y-6">
                <div className="w-14 h-14 bg-[#0097b2]/10 rounded-2xl flex items-center justify-center text-[#0097b2]">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{feature.title}</h2>
                <p className="text-lg text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
              <div className="lg:w-1/2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 group">
                  <div className="absolute inset-0 bg-[#0097b2]/10 group-hover:bg-transparent transition-colors duration-500"></div>
                  <img 
                    src={feature.img} 
                    alt={feature.title} 
                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center bg-[#0097b2]/10 rounded-3xl p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Ready to upgrade your customer experience?</h2>
          <Link to="/contact">
             <Button size="lg">Get Started Today</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Features;
