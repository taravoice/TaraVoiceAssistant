
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Calendar, PhoneCall, MessageSquare, Clock, BarChart3, Mic2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useSite } from '../context/SiteContext';
import { MediaRenderer } from '../components/MediaRenderer';
import { SEO } from '../components/SEO';

const Home: React.FC = () => {
  const { content } = useSite();

  const getBustedUrl = (url: string) => {
    if (!url || url === '') return '';
    if (url.startsWith('http')) {
      return `${url}${url.includes('?') ? '&' : '?'}t=${content.updatedAt}`;
    }
    return url;
  };

  const customSections = content.customSections.filter(s => s.page === 'Home');

  return (
    <div className="w-full">
      <SEO 
        title="AI Appointment Setter | Automated 24/7 Phone Answering for Businesses"
        description="Automate inbound calls, appointment scheduling, and repetitive customer questions with Tara AI Appointment Setter. Human-like voice, customizable instructions, and 24/7 availability."
      />

      {/* Hero Section */}
      <section className="relative bg-[#f2f2f2] overflow-hidden min-h-[600px] flex items-center">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
           {/* HERO BACKGROUND IMAGE - OPACITY CONTROL HERE (opacity-40 = 40%) */}
           {content.images.homeHeroBg && (
             <MediaRenderer 
               src={getBustedUrl(content.images.homeHeroBg)} 
               alt="AI receptionist for business dashboard background"
               className="w-full h-full object-cover opacity-100"
               videoClassName="w-full h-full object-cover opacity-100"
             />
           )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#0097b2]/10 text-[#0097b2] text-sm font-semibold">
                <span className="flex h-2 w-2 rounded-full bg-[#0097b2] mr-2"></span>
                AI Phone Agent for Small Business
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight">
                {content.home.heroTitle}
              </h1>
              <p className="text-xl text-slate-600 max-w-lg">
                {content.home.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contact">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/features">
                   <Button variant="outline" size="lg" className="w-full sm:w-auto">
                     Learn More
                   </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
               <div className="absolute -inset-4 bg-gradient-to-r from-[#0097b2] to-[#007f96] rounded-2xl blur-lg opacity-30 animate-pulse"></div>
               <div className="relative w-full rounded-2xl shadow-2xl border border-white/20 overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                 <iframe 
                   className="absolute top-0 left-0 w-full h-full"
                   src="https://www.youtube-nocookie.com/embed/0LT64_mgkro?rel=0&modestbranding=1" 
                   title="Tara Voice Assistant Demo - AI Call Answering Software" 
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                   allowFullScreen
                 ></iframe>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Summary - Keyword Optimized First 100 Words */}
      <section className="py-20 bg-[#f2f2f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">{content.home.aboutTitle}</h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed whitespace-pre-wrap">
            {content.home.aboutText}
          </p>
          <p className="text-lg text-slate-600 leading-relaxed">
            Our mission is to revolutionize customer engagement by providing the best <strong>AI call answering software</strong> on the market. We help you <strong>reduce inbound calls automation</strong> friction, creating scalable automation that lowers costs and saves time. As a premier <strong>AI virtual receptionist service</strong>, Tara ensures every missed call becomes a booked appointment.
          </p>
        </div>
      </section>

      {/* Custom Sections */}
      {customSections.map((section) => (
        <section key={section.id} className="py-20 bg-white">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="order-2 md:order-1">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">{section.title}</h2>
                    <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                 </div>
                 {section.image && (
                   <div className="order-1 md:order-2">
                      <MediaRenderer 
                        src={getBustedUrl(section.image)} 
                        alt={`${section.title} - AI Phone Answering System`} 
                        className="rounded-2xl shadow-lg w-full h-auto object-cover" 
                      />
                   </div>
                 )}
              </div>
           </div>
        </section>
      ))}

      {/* Key Features Grid - Mid Intent Keywords */}
      <section className="py-20 bg-[#f2f2f2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Powerful AI Call Handler Features</h2>
            <p className="mt-4 text-slate-600">Everything you need in a modern business phone automation tool.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[
               { icon: Calendar, title: "Automated Appointment Scheduling", desc: "Seamlessly books appointments directly into your calendar using AI." },
               { icon: MessageSquare, title: "FAQ Answering & Support", desc: "Instantly answers common customer questions accurately without human intervention." },
               { icon: Clock, title: "24/7 Automated Phone Answering", desc: "Never miss a call, day or night, weekends or holidays." },
               { icon: CheckCircle2, title: "Calendar Sync", desc: "Native integration with Cal.com and other major providers." },
               { icon: PhoneCall, title: "Human-like AI Voice", desc: "Natural conversations that feel like talking to a real person." },
               { icon: BarChart3, title: "Business Insights", desc: "Analytics on call volume, peak times, and customer intent." },
             ].map((feature, idx) => (
               <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 group">
                 <div className="w-12 h-12 bg-[#0097b2] rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                   <feature.icon className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                 <p className="text-slate-600">{feature.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Industries - Long Tail Keywords */}
      <section className="py-20 bg-black text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0097b2] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div>
               <h2 className="text-3xl lg:text-4xl font-bold mb-6">Industries We Serve</h2>
               <p className="text-slate-300 text-lg mb-8">
                 Tara adapts to the specific needs of service-based businesses, acting as a tailored AI receptionist for various sectors.
               </p>
               <ul className="space-y-4">
                 {[
                   'AI Appointment Setter for Clinics & Medical', 
                   'AI Receptionist for Salons & Spas', 
                   'Home Services & HVAC Answering', 
                   'Automotive & Dealership Inbound Automation', 
                   'Legal Intake & Law Firm Reception'
                 ].map((item, i) => (
                   <li key={i} className="flex items-center space-x-3 text-lg font-medium">
                     <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0097b2] flex items-center justify-center">
                       <CheckCircle2 className="w-4 h-4 text-white" />
                     </span>
                     <span>{item}</span>
                   </li>
                 ))}
               </ul>
             </div>
             <div className="grid grid-cols-2 gap-4">
                {content.images.homeIndustry1 && (
                  <MediaRenderer 
                    src={getBustedUrl(content.images.homeIndustry1)} 
                    className="rounded-2xl opacity-80 hover:opacity-100 transition-opacity w-full h-48 object-cover" 
                    alt="AI appointment setter for clinics" 
                  />
                )}
                {content.images.homeIndustry2 && (
                  <MediaRenderer 
                    src={getBustedUrl(content.images.homeIndustry2)} 
                    className="rounded-2xl opacity-80 hover:opacity-100 transition-opacity mt-8 w-full h-48 object-cover" 
                    alt="AI receptionist for salons" 
                  />
                )}
             </div>
           </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#f2f2f2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How Tara Works</h2>
            <p className="mt-4 text-slate-600">Seamless integration into your daily workflow.</p>
          </div>
          
          <div className="relative">
             <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-300 -z-10 transform -translate-y-1/2"></div>
             <div className="grid md:grid-cols-3 gap-8">
               <div className="bg-white p-6 rounded-xl border-2 border-slate-200 text-center relative">
                 <div className="w-16 h-16 mx-auto bg-white border-4 border-[#0097b2]/20 rounded-full flex items-center justify-center text-[#0097b2] mb-4 z-10">
                   <PhoneCall className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold mb-2">1. Call Comes In</h3>
                 <p className="text-slate-500">Customer calls your existing business number. Tara picks up instantly as your <strong>AI virtual receptionist</strong>.</p>
               </div>

               <div className="bg-white p-6 rounded-xl border-2 border-slate-200 text-center relative">
                 <div className="w-16 h-16 mx-auto bg-white border-4 border-[#0097b2]/20 rounded-full flex items-center justify-center text-[#0097b2] mb-4 z-10">
                   <Mic2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold mb-2">2. Natural Conversation</h3>
                 <p className="text-slate-500">The <strong>voice AI</strong> understands intent, answers questions, and qualifies the lead.</p>
               </div>

               <div className="bg-white p-6 rounded-xl border-2 border-slate-200 text-center relative">
                 <div className="w-16 h-16 mx-auto bg-white border-4 border-[#0097b2]/20 rounded-full flex items-center justify-center text-[#0097b2] mb-4 z-10">
                   <Calendar className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold mb-2">3. Synced & Booked</h3>
                 <p className="text-slate-500">Appointment is added to your Cal.com calendar via <strong>automated appointment scheduling</strong>.</p>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-[#f2f2f2]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose an AI Call Handler?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 "Increased Productivity",
                 "Reduced Operational Costs",
                 "Never Miss a Customer Call",
                 "Improved Customer Satisfaction",
                 "Easy System Integration"
               ].map((benefit, i) => (
                 <div key={i} className="flex items-center space-x-4 bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#0097b2] rounded-full flex items-center justify-center">
                       <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">{benefit}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 bg-[#f2f2f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Simple, Transparent Pricing</h2>
          <p className="text-lg text-slate-600 mb-8">Start automating for just $97/month.</p>
          <Link to="/pricing">
             <Button variant="outline" size="lg">View Full Pricing</Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#0097b2] to-[#007f96] text-white text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-3xl md:text-5xl font-bold mb-6">Start Automating Your Customer Calls Today</h2>
           <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
             Join hundreds of businesses saving time and growing revenue with Tara Voice Assistant.
           </p>
           <Link to="/contact">
             <Button size="lg" className="bg-white text-[#0097b2] hover:bg-slate-100 hover:text-[#007f96]">
               Get Started Now
             </Button>
           </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
