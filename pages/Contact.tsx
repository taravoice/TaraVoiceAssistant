import React, { useState, useRef } from 'react';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useSite } from '../context/SiteContext';
import emailjs from '@emailjs/browser';

const Contact: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { content } = useSite();
  const customSections = content.customSections.filter(s => s.page === 'Contact');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setLoading(true);
    setStatus('idle');

    // Get keys from environment
    // Use getEnv helper concept or direct import.meta if standard
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      alert("EmailJS configuration missing. Please check Vercel Environment Variables.");
      setLoading(false);
      return;
    }

    try {
      await emailjs.sendForm(
        serviceId,
        templateId,
        formRef.current,
        publicKey
      );
      setStatus('success');
      formRef.current.reset();
    } catch (error) {
      console.error('Email Error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#d9d9d9] min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900">Get in Touch</h1>
          <p className="mt-4 text-xl text-slate-600">Ready to automate? Send us a message or book a demo.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div className="bg-white p-10 rounded-3xl h-full border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Contact Information</h2>
            <div className="space-y-8">
               <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#0097b2]/10 rounded-full flex items-center justify-center text-[#0097b2] shrink-0">
                     <Mail className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="font-semibold text-slate-900">Email Us</p>
                     <a href="mailto:info@taravoiceassistant.com" className="text-[#0097b2] hover:underline">info@taravoiceassistant.com</a>
                     <p className="text-sm text-slate-500 mt-1">We respond within 24 hours.</p>
                  </div>
               </div>

               <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#0097b2]/10 rounded-full flex items-center justify-center text-[#0097b2] shrink-0">
                     <Phone className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="font-semibold text-slate-900">Call Us</p>
                     <a href="tel:6206282377" className="text-[#0097b2] hover:underline">620 628 2377</a>
                     <p className="text-sm text-slate-500 mt-1">Mon-Fri, 9am-6pm EST</p>
                  </div>
               </div>

               <div className="p-6 bg-[#0097b2] rounded-2xl text-white mt-8">
                  <h3 className="font-bold text-lg mb-2">Book a Live Demo</h3>
                  <p className="text-white/90 mb-4">See Tara in action. Schedule a 15-minute walkthrough with our team.</p>
                  <Button variant="secondary" className="bg-white text-[#0097b2] hover:bg-slate-100 w-full">Schedule Demo</Button>
               </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white p-8 border border-slate-200 rounded-3xl shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              
              {status === 'success' && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-4 border border-green-200">
                  Thank you! Your message has been sent successfully. We will be in touch shortly.
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 border border-red-200">
                  Something went wrong. Please try again or email us directly at info@taravoiceassistant.com.
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      name="user_name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      name="user_email"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                      placeholder="john@example.com"
                    />
                 </div>
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                 <input 
                   type="tel" 
                   name="user_phone"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                   placeholder="(555) 000-0000"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">How can we help?</label>
                 <textarea 
                   rows={4} 
                   name="message"
                   required
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all resize-none"
                   placeholder="Tell us about your business needs..."
                 ></textarea>
              </div>

              <Button type="submit" size="lg" fullWidth className="flex justify-center items-center" disabled={loading}>
                 {loading ? (
                    <>
                       <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Sending...
                    </>
                 ) : (
                    <>
                       Send Message <Send className="ml-2 w-4 h-4" />
                    </>
                 )}
              </Button>
            </form>
          </div>
        </div>

        {/* Custom Sections */}
        {customSections.map((section) => (
          <section key={section.id} className="py-20 mt-12 bg-white rounded-3xl shadow-sm">
             <div className="px-8">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                   <div className="order-2 md:order-1">
                      <h2 className="text-3xl font-bold text-slate-900 mb-6">{section.title}</h2>
                      <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                   </div>
                   {section.image && (
                     <div className="order-1 md:order-2">
                        <img src={section.image} alt={section.title} className="rounded-2xl shadow-lg w-full h-auto object-cover" />
                     </div>
                   )}
                </div>
             </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Contact;
