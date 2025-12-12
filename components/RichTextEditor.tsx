
import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Quote, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialValue, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize content
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== initialValue) {
      contentRef.current.innerHTML = initialValue;
    }
  }, []);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
  };

  const ToolbarBtn = ({ icon: Icon, cmd, arg, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, arg); }}
      className="p-2 text-slate-600 hover:text-[#0097b2] hover:bg-slate-100 rounded transition-colors"
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#0097b2] transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <ToolbarBtn icon={Heading1} cmd="formatBlock" arg="H2" title="Heading" />
        <ToolbarBtn icon={Heading2} cmd="formatBlock" arg="H3" title="Subheading" />
        <div className="w-px h-6 bg-slate-300 mx-2"></div>
        <ToolbarBtn icon={Bold} cmd="bold" title="Bold" />
        <ToolbarBtn icon={Italic} cmd="italic" title="Italic" />
        <ToolbarBtn icon={Quote} cmd="formatBlock" arg="blockquote" title="Quote" />
        <div className="w-px h-6 bg-slate-300 mx-2"></div>
        <ToolbarBtn icon={List} cmd="insertUnorderedList" title="Bullet List" />
        <div className="w-px h-6 bg-slate-300 mx-2"></div>
        <ToolbarBtn icon={Undo} cmd="undo" title="Undo" />
        <ToolbarBtn icon={Redo} cmd="redo" title="Redo" />
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[400px] p-6 outline-none prose prose-slate max-w-none overflow-y-auto"
        style={{ whiteSpace: 'pre-wrap' }}
      ></div>
    </div>
  );
};
