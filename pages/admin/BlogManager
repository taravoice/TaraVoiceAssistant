
import React, { useState } from 'react';
import { useSite, BlogPost } from '../../context/SiteContext';
import { Button } from '../../components/Button';
import { RichTextEditor } from '../../components/RichTextEditor';
import { Plus, Edit2, Trash2, ChevronLeft, Save, Calendar } from 'lucide-react';

const BlogManager: React.FC = () => {
  const { blogPosts, saveBlogPost, deleteBlogPost } = useSite();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);

  const handleCreateNew = () => {
    setCurrentPost({
      id: Date.now().toString(),
      title: '',
      slug: '',
      category: 'General',
      excerpt: '',
      content: '<p>Start writing your article here...</p>',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    });
    setIsEditing(true);
  };

  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      await deleteBlogPost(id);
    }
  };

  const handleSave = async () => {
    if (currentPost && currentPost.title) {
      // Auto-generate slug if empty
      let finalPost = { ...currentPost };
      if (!finalPost.slug) {
        finalPost.slug = finalPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      
      await saveBlogPost(finalPost);
      setIsEditing(false);
      setCurrentPost(null);
    } else {
      alert("Please enter a title.");
    }
  };

  if (isEditing && currentPost) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsEditing(false)}
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to List
          </button>
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
             <Button onClick={handleSave} className="flex items-center">
               <Save className="w-4 h-4 mr-2" /> Publish Changes
             </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Article Title</label>
              <input 
                type="text" 
                value={currentPost.title}
                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none text-lg font-semibold"
                placeholder="Enter title here..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
              <input 
                type="text" 
                value={currentPost.category}
                onChange={(e) => setCurrentPost({ ...currentPost, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none"
                placeholder="e.g. Healthcare"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Short Summary (Excerpt)</label>
            <textarea 
              rows={2}
              value={currentPost.excerpt}
              onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none resize-none"
              placeholder="A brief description for the blog card..."
            />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">URL Slug (Optional - auto-generated if empty)</label>
             <input 
                type="text" 
                value={currentPost.slug}
                onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0097b2] outline-none text-slate-500 font-mono text-sm"
                placeholder="e.g. ai-appointment-setter"
             />
          </div>
        </div>

        <div className="space-y-2">
           <label className="block text-xl font-bold text-slate-900">Article Content</label>
           <RichTextEditor 
             initialValue={currentPost.content} 
             onChange={(html) => setCurrentPost({ ...currentPost, content: html })} 
           />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blog Manager</h1>
          <p className="text-slate-500">Create and edit SEO articles.</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center">
          <Plus className="w-5 h-5 mr-2" /> New Article
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="grid grid-cols-12 bg-slate-50 p-4 border-b border-slate-200 font-semibold text-slate-700">
            <div className="col-span-6">Title</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-3 text-right">Actions</div>
         </div>
         <div className="divide-y divide-slate-100">
            {blogPosts.map(post => (
               <div key={post.id} className="grid grid-cols-12 p-4 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-6 pr-4">
                     <h3 className="font-bold text-slate-900 line-clamp-1">{post.title}</h3>
                     <div className="flex items-center text-xs text-slate-400 mt-1">
                        <Calendar className="w-3 h-3 mr-1" /> {post.date}
                        <span className="mx-2">•</span>
                        <span className="font-mono">{post.slug}</span>
                     </div>
                  </div>
                  <div className="col-span-3">
                     <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold uppercase">
                        {post.category}
                     </span>
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                     <button 
                       onClick={() => handleEdit(post)}
                       className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                       title="Edit"
                     >
                        <Edit2 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => handleDelete(post.id)}
                       className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                       title="Delete"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            ))}
            {blogPosts.length === 0 && (
               <div className="p-8 text-center text-slate-500 italic">No articles yet. Create one!</div>
            )}
         </div>
      </div>
    </div>
  );
};

export default BlogManager;
