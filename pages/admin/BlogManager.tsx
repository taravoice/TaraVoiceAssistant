
import React from 'react';

const BlogManager: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-20 text-center">
      <div className="bg-slate-50 p-10 rounded-2xl border-2 border-dashed border-slate-300 inline-block">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Blog Manager Disabled</h1>
        <p className="text-slate-500 max-w-md mx-auto">
          The blog is currently operating in <strong>Static SEO Mode</strong>.
          <br />
          Please edit <code>data/blogPosts.ts</code> directly in the source code to manage articles.
        </p>
      </div>
    </div>
  );
};

export default BlogManager;
