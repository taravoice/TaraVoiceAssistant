
import React from 'react';
import { SEO } from '../components/SEO';

const Blog: React.FC = () => {
  return (
    <div className="bg-[#d9d9d9] min-h-screen">
      <SEO 
        title="Blog | Tara Voice Assistant AI Insights" 
        description="Read the latest updates and insights about AI appointment setting, voice automation, and business reception solutions."
      />
      <div className="bg-[#d9d9d9] py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Our Blog</h1>
          <p className="mt-4 text-xl text-slate-600">Insights on AI, Automation, and Business Efficiency.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         <div className="text-center text-slate-500 text-lg">
            <p>Check back soon for our latest articles and updates.</p>
         </div>
      </div>
    </div>
  );
};

export default Blog;
