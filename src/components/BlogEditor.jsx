import React, { useState, useRef, useEffect } from 'react';
import { Save, Image as ImageIcon, Code, Link as LinkIcon, Type } from 'lucide-react';
import { Button } from './ui/Button.jsx'; // 添加 .jsx 后缀
import { Card } from './ui/Card.jsx';     // 添加 .jsx 后缀

const BlogEditor = ({ onSave, onCancel, initialData = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData?.content && editorRef.current) {
      editorRef.current.innerHTML = initialData.content;
    }
  }, [initialData]);

  // 执行编辑命令
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  // 插入代码块 (仿飞书风格)
  const insertCodeBlock = () => {
    const codeHtml = `
      <div class="my-4 relative group">
        <pre class="bg-gray-100 text-gray-800 p-4 rounded-lg border-l-4 border-blue-500 font-mono text-sm overflow-x-auto shadow-sm"><code>在此处输入代码...</code></pre>
      </div><p><br/></p>
    `;
    document.execCommand('insertHTML', false, codeHtml);
  };

  // 插入带备注的图片
  const insertImage = () => {
    const url = prompt("请输入图片链接 (URL):");
    if (url) {
      const caption = prompt("请输入图片备注/说明 (可选):") || "";
      const imgHtml = `
        <div class="my-6 text-center">
          <img src="${url}" class="max-w-full h-auto rounded-lg shadow-md mx-auto hover:shadow-xl transition-shadow duration-300" style="max-height: 500px;" />
          ${caption ? `<p class="text-gray-500 text-xs mt-2 italic border-b inline-block pb-1">${caption}</p>` : ''}
        </div><p><br/></p>
      `;
      document.execCommand('insertHTML', false, imgHtml);
    }
  };

  // 插入链接
  const insertLink = () => {
    const url = prompt("请输入链接地址:");
    if (url) execCommand('createLink', url);
  };

  const handleSave = () => {
    if (!title.trim()) return alert("请输入文章标题");
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    if (!content.trim()) return alert("请输入文章内容");

    setIsSaving(true);
    onSave({ title, content });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* 顶部工具栏 */}
      <div className="flex justify-between items-center mb-4 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-gray-200 sticky top-0 z-20 shadow-sm">
        <input 
          type="text" 
          placeholder="请输入文章标题..." 
          className="text-xl font-bold bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 flex-1 min-w-0"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "发布中..." : "发布"} <Save size={16} />
            </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-[500px] overflow-hidden !p-0">
        {/* 编辑器工具栏 */}
        <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 bg-gray-50 items-center">
            {/* 字体大小 */}
            <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => execCommand('formatBlock', 'H1')} className="p-2 hover:bg-gray-100" title="大标题 H1"><Type size={18} /><span className="text-[10px] align-top font-bold">1</span></button>
                <button onClick={() => execCommand('formatBlock', 'H2')} className="p-2 hover:bg-gray-100" title="中标题 H2"><Type size={16} /><span className="text-[10px] align-top font-bold">2</span></button>
                <button onClick={() => execCommand('formatBlock', 'H3')} className="p-2 hover:bg-gray-100" title="小标题 H3"><Type size={14} /><span className="text-[10px] align-top font-bold">3</span></button>
                <button onClick={() => execCommand('formatBlock', 'P')} className="p-2 hover:bg-gray-100 font-serif" title="正文">P</button>
            </div>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-200 rounded-lg font-bold" title="加粗">B</button>
            <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-200 rounded-lg italic" title="斜体">I</button>
            <button onClick={() => execCommand('strikeThrough')} className="p-2 hover:bg-gray-200 rounded-lg line-through" title="删除线">S</button>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button onClick={insertCodeBlock} className="p-2 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-sm" title="代码块 (类似飞书)">
                <Code size={16} /> <span className="hidden sm:inline">代码</span>
            </button>
            <button onClick={insertImage} className="p-2 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-sm" title="图片+备注">
                <ImageIcon size={16} /> <span className="hidden sm:inline">图片</span>
            </button>
            <button onClick={insertLink} className="p-2 hover:bg-gray-200 rounded-lg" title="超链接">
                <LinkIcon size={16} />
            </button>
        </div>

        {/* 编辑区域 */}
        <div 
            ref={editorRef}
            contentEditable
            className="flex-1 p-8 overflow-y-auto outline-none prose prose-blue max-w-none custom-blog-content"
            style={{ minHeight: '400px' }}
            onKeyDown={(e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '    ');
                }
            }}
        >
        </div>
        <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            支持所见即所得编辑 (WYSIWYG)
        </div>
      </Card>
    </div>
  );
};

export default BlogEditor;