
import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useSite } from '../context/SiteContext'; // Use dynamic data
import { ArrowLeft, Calendar, Tag, ChevronRight, X } from 'lucide-react';
import { Button } from '../components/Button';

const BlogPost: React.FC = () => {
  const { slug } = useParams();
  const { blogPosts } = useSite(); // Get dynamic posts
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Find the post from context
  const post = blogPosts.find(p => p.slug === slug);

  // Scroll to top when slug changes and reset filter
  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedCategory(null);
  }, [slug]);

  if (!post) {
    // Optional: show loading state here if blogPosts is empty initially
    if (blogPosts.length === 0) return <div className="p-20 text-center">Loading...</div>;
    return <Navigate to="/blog" replace />;
  }

  // 1. Get all available categories
  const allCategories = Array.from(new Set(blogPosts.map(p => p.category)));

  // 2. Filter the Sidebar List based on selection
  // Always exclude current post
  let sidebarPosts = blogPosts.filter(p => p.id !== post.id);
  
  // If category is selected, filter by it
  if (selectedCategory) {
      sidebarPosts = sidebarPosts.filter(p => p.category === selectedCategory);
  }

  return (
    <div className="bg-[#d9d9d9] min-h-screen">
      <SEO 
        title={`${post.title} | Tara Voice Blog`} 
        description={post.excerpt}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
         <div className="grid lg:grid-cols-12 gap-12">
            
            {/* Main Content Column */}
            <div className="lg:col-span-8">
               <div className="mb-8">
                  <Link to="/blog" className="inline-flex items-center text-slate-500 hover:text-[#0097b2] transition-colors mb-6">
                     <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
                  </Link>
                  <div className="flex items-center space-x-4 text-sm text-[#0097b2] font-semibold mb-4">
                     <span className="flex items-center bg-[#0097b2]/10 px-3 py-1 rounded-full">
                        <Tag className="w-3 h-3 mr-1" /> {post.category}
                     </span>
                     <span className="flex items-center text-slate-500">
                        <Calendar className="w-3 h-3 mr-1" /> {post.date}
                     </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                     {post.title}
                  </h1>
               </div>

               {/* Article Body */}
               <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
                  <article 
                     className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-[#0097b2]"
                     dangerouslySetInnerHTML={{ __html: post.content }}
                  >
                  </article>
                  
                  {/* Bottom CTA */}
                  <div className="mt-12 pt-8 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 md:-mx-12 md:-mb-12 p-8 rounded-b-3xl text-center">
                     <h3 className="text-2xl font-bold text-slate-900 mb-6">Ready to automate your calls?</h3>
                     <Link to="/contact">
                        <Button size="lg">Get Started</Button>
                     </Link>
                  </div>
               </div>
            </div>

            {/* Sidebar Navigation Column */}
            <div className="lg:col-span-4 space-y-8">
               
               {/* Search / Filter (Now Functional) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-900">Explore Topics</h3>
                     {selectedCategory && (
                        <button 
                           onClick={() => setSelectedCategory(null)}
                           className="text-xs text-slate-400 hover:text-[#0097b2] flex items-center transition-colors"
                        >
                           <X className="w-3 h-3 mr-1" /> Clear
                        </button>
                     )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {allCategories.map(cat => (
                        <button 
                           key={cat} 
                           onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                           className={`text-xs font-medium px-3 py-1 rounded-full border transition-all duration-200 ${
                              selectedCategory === cat 
                              ? 'bg-[#0097b2] text-white border-[#0097b2] shadow-md transform scale-105'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#0097b2] hover:text-[#0097b2]'
                           }`}
                        >
                           {cat}
                        </button>
                     ))}
                  </div>
               </div>

               {/* More Articles List (Filtered) */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24 transition-all duration-300">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                     <h3 className="font-bold text-slate-900">
                        {selectedCategory ? `${selectedCategory} Articles` : 'More Articles'}
                     </h3>
                     <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                        {sidebarPosts.length}
                     </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                     {sidebarPosts.length > 0 ? (
                        sidebarPosts.map(op => (
                           <Link 
                              key={op.id} 
                              to={`/blog/${op.slug}`}
                              className="block p-4 hover:bg-slate-50 transition-colors group"
                           >
                              <h4 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-[#0097b2] line-clamp-2">
                                 {op.title}
                              </h4>
                              <div className="flex items-center justify-between mt-2">
                                 <span className="text-xs text-slate-400">{op.date}</span>
                                 <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0097b2]" />
                              </div>
                           </Link>
                        ))
                     ) : (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                           No other articles found in this category.
                        </div>
                     )}
                  </div>
               </div>

            </div>
         </div>
      </div>
    </div>
  );
};

export default BlogPost;
