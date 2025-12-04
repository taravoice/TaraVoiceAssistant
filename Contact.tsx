import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { Button } from '../components/Button';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate submission
    alert('Thank you for your interest! We will contact you shortly.');
    setFormData({ name: '', email: '', phone: '', message: '' });
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
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 border border-slate-200 rounded-3xl shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                      placeholder="john@example.com"
                    />
                 </div>
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                 <input 
                   type="tel" 
                   value={formData.phone}
                   onChange={(e) => setFormData({...formData, phone: e.target.value})}
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all"
                   placeholder="(555) 000-0000"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">How can we help?</label>
                 <textarea 
                   rows={4} 
                   required
                   value={formData.message}
                   onChange={(e) => setFormData({...formData, message: e.target.value})}
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0097b2] focus:border-transparent outline-none transition-all resize-none"
                   placeholder="Tell us about your business needs..."
                 ></textarea>
              </div>

              <Button type="submit" size="lg" fullWidth className="flex justify-center items-center">
                 Send Message <Send className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;