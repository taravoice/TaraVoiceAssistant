import React from 'react';
import { Check, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const Pricing: React.FC = () => {
  return (
    <div className="bg-[#d9d9d9] min-h-screen">
      <div className="py-20 text-center">
        <h1 className="text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h1>
        <p className="mt-4 text-xl text-slate-600">No hidden contracts. Scale as you grow.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex justify-center">
           {/* Pricing Card */}
           <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-md w-full relative">
              <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-[#0097b2] to-[#007f96]"></div>
              <div className="p-8 sm:p-10">
                <h3 className="text-2xl font-bold text-slate-900">Standard Plan</h3>
                <p className="text-slate-500 mt-2">Everything you need to automate.</p>
                
                <div className="my-8 flex items-baseline">
                   <span className="text-5xl font-extrabold text-slate-900">$97.00</span>
                   <span className="text-slate-500 ml-2">/month</span>
                </div>

                <ul className="space-y-4 mb-8">
                   {[
                     { label: "One-time Setup Fee", value: "$149.00" },
                     { label: "Inbound Call Rate", value: "$0.26 / min" },
                     { label: "24/7 AI Availability", value: true },
                     { label: "Calendar Integration", value: true },
                     { label: "Dashboard Access", value: true },
                     { label: "Call Recordings & Transcripts", value: true },
                   ].map((item, i) => (
                     <li key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0">
                        <div className="flex items-center text-slate-700">
                           <Check className="w-4 h-4 text-[#0097b2] mr-2" />
                           {item.label}
                        </div>
                        <div className="font-semibold text-slate-900">
                           {item.value === true ? "" : item.value}
                        </div>
                     </li>
                   ))}
                </ul>

                <Link to="/contact">
                   <Button fullWidth size="lg">Choose Plan</Button>
                </Link>
                <p className="text-xs text-center text-slate-400 mt-4">Cancel anytime.</p>
              </div>
           </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
           <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently Asked Questions</h2>
           <div className="space-y-6">
              {[
                {
                   q: "How does the setup fee work?",
                   a: "The $149 one-time setup fee covers the customization of your AI assistant, including knowledge base training, calendar syncing, and testing to ensure it represents your brand perfectly."
                },
                {
                   q: "Can I cancel my subscription?",
                   a: "Yes, you can cancel your monthly subscription at any time. There are no long-term locking contracts."
                },
                {
                   q: "How is the per-minute rate calculated?",
                   a: "Billing is calculated based on the duration of calls handled by the AI, rounded up to the nearest minute. You are billed for usage at the end of your billing cycle."
                },
                {
                   q: "Does it integrate with my existing phone number?",
                   a: "Yes, we provide you with a forwarding number. You simply set up call forwarding on your existing business line to send missed or all calls to Tara."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="flex items-start font-bold text-slate-900 mb-2">
                      <HelpCircle className="w-5 h-5 text-[#0097b2] mr-2 mt-0.5 shrink-0" />
                      {faq.q}
                   </h3>
                   <p className="text-slate-600 pl-7">{faq.a}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;