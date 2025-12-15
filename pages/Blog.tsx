
import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useSite } from '../context/SiteContext'; // Use dynamic data
import { ArrowRight, Calendar, Tag } from 'lucide-react';

const Blog: React.FC = () => {
  const { blogPosts } = useSite(); // Get dynamic posts

  return (
    <div className="bg-[#f2f2f2] min-h-screen">
      <SEO 
        title="Blog | Tara Voice Assistant AI Insights & Tips" 
        description="Explore 20+ articles on AI appointment setting, voice automation strategies, and business efficiency. Learn how to reduce missed calls."
      />
      
      {/* Header */}
      <div className="bg-[#f2f2f2] py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Tara Voice AI Blog</h1>
          <p className="mt-4 text-xl text-slate-600">Insights on AI, Automation, and Business Growth.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
               <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-8 h-full flex flex-col">
                     <div className="flex items-center text-xs font-semibold text-[#0097b2] mb-4">
                        <Tag className="w-3 h-3 mr-1" />
                        <span className="uppercase tracking-wider">{post.category}</span>
                     </div>
                     <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#0097b2] transition-colors leading-tight">
                        {post.title}
                     </h2>
                     <p className="text-slate-600 mb-6 line-clamp-3 text-sm flex-grow">
                        {post.excerpt}
                     </p>
                     <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                        <span className="text-xs text-slate-400 flex items-center">
                           <Calendar className="w-3 h-3 mr-1" /> {post.date}
                        </span>
                        <span className="text-[#0097b2] text-sm font-semibold flex items-center">
                           Read Article <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </span>
                     </div>
                  </div>
               </Link>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Blog;
