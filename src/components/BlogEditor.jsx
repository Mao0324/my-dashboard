import React, { useState, useRef, useEffect } from 'react';
import { Save, Image as ImageIcon, Code, Link as LinkIcon, Type, Plus, X, Heading1, Heading2, Heading3, Pilcrow } from 'lucide-react';
// 修正：使用相对路径，不带扩展名 (与 Dashboard.jsx 保持一致)
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const BlogEditor = ({ onSave, onCancel, initialData = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeBlockTop, setActiveBlockTop] = useState(0);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [showPlusBtn, setShowPlusBtn] = useState(false);

  useEffect(() => {
    if (initialData?.content && editorRef.current) {
      editorRef.current.innerHTML = initialData.content;
    } else if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = "<p><br/></p>";
    }
  }, [initialData]);

  const updateActiveBlockPosition = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    
    while (node && node.parentNode && node.parentNode !== editorRef.current) {
      node = node.parentNode;
    }

    if (node && editorRef.current.contains(node)) {
      const offsetTop = node.offsetTop;
      setActiveBlockTop(offsetTop);
      setShowPlusBtn(true);
    } else {
      setShowPlusBtn(false);
      setShowFloatingMenu(false);
    }
  };

  const execCommand = (command, value = null) => {
    if(editorRef.current) editorRef.current.focus();
    document.execCommand(command, false, value);
    updateActiveBlockPosition(); 
    setShowFloatingMenu(false); 
  };

  // Bug修复：插入代码块后强制追加一个带 ID 的空行，并尝试聚焦
  const insertCodeBlock = () => {
    const uniqueId = Date.now();
    const codeHtml = `
      <div class="my-4 relative group">
        <pre class="bg-gray-100 text-gray-800 p-4 rounded-lg border-l-4 border-blue-500 font-mono text-sm overflow-x-auto shadow-sm"><code>在此处输入代码...</code></pre>
      </div>
      <p id="cursor-target-${uniqueId}"><br/></p> 
    `;
    execCommand('insertHTML', codeHtml);
    
    setTimeout(() => {
        const target = document.getElementById(`cursor-target-${uniqueId}`);
        if (target) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(target, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            target.removeAttribute('id');
        }
    }, 10);
  };

  const insertImage = () => {
    const url = prompt("请输入图片链接 (URL):");
    if (url) {
      const caption = prompt("请输入图片备注 (可选):") || "";
      const imgHtml = `
        <div class="my-6 text-center group">
          <img src="${url}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" />
          ${caption ? `<p class="text-gray-500 text-xs mt-2 italic">${caption}</p>` : ''}
        </div>
        <p><br/></p>
      `;
      execCommand('insertHTML', imgHtml);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return alert("请输入文章标题");
    const content = editorRef.current.innerHTML;
    if (!content.trim()) return alert("请输入文章内容");
    setIsSaving(true);
    onSave({ title, content });
    setIsSaving(false);
  };

  // Bug修复：点击底部空白区域，自动在末尾追加新行，防止死锁在代码块中
  const handleEditorContainerClick = (e) => {
    if (e.target === editorRef.current) {
        const lastChild = editorRef.current.lastElementChild;
        if (!lastChild || lastChild.tagName !== 'P' || lastChild.innerText.trim() !== '') {
             if (lastChild) {
                 const rect = lastChild.getBoundingClientRect();
                 if (e.clientY > rect.bottom) {
                     const p = document.createElement('p');
                     p.innerHTML = '<br/>';
                     editorRef.current.appendChild(p);
                     
                     const range = document.createRange();
                     const sel = window.getSelection();
                     range.setStart(p, 0);
                     range.collapse(true);
                     sel.removeAllRanges();
                     sel.addRange(range);
                 }
             }
        }
    }
    updateActiveBlockPosition();
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      <div className="flex justify-between items-center mb-2 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 sticky top-0 z-30 shadow-sm">
        <input 
          type="text" 
          placeholder="无标题文章" 
          className="text-2xl font-bold bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-300 flex-1 min-w-0"
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

      <Card className="flex-1 flex flex-col min-h-[500px] overflow-hidden !p-0 relative">
        <div className="relative flex-1 overflow-y-auto custom-scrollbar" onClick={handleEditorContainerClick}>
            {showPlusBtn && (
                <div 
                    className="absolute left-4 md:left-10 z-20 transition-all duration-100 flex items-center"
                    style={{ top: activeBlockTop + 4 }} 
                >
                    <div 
                        className="relative group"
                        onMouseEnter={() => setShowFloatingMenu(true)}
                        onMouseLeave={() => setTimeout(() => !document.querySelector('.floating-menu:hover') && setShowFloatingMenu(false), 300)}
                    >
                        <button 
                            className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="添加内容"
                        >
                            <Plus size={20} />
                        </button>

                        {(showFloatingMenu || false) && (
                            <div 
                                className="floating-menu absolute left-8 top-[-10px] bg-white shadow-xl border border-gray-100 rounded-xl p-2 flex gap-1 animate-fade-in z-50 min-w-[320px]"
                                onMouseEnter={() => setShowFloatingMenu(true)}
                                onMouseLeave={() => setShowFloatingMenu(false)}
                            >
                                <MenuBtn onClick={() => execCommand('formatBlock', 'H1')} icon={Heading1} label="大标题" />
                                <MenuBtn onClick={() => execCommand('formatBlock', 'H2')} icon={Heading2} label="中标题" />
                                <MenuBtn onClick={() => execCommand('formatBlock', 'H3')} icon={Heading3} label="小标题" />
                                <div className="w-px bg-gray-200 mx-1"></div>
                                <MenuBtn onClick={() => execCommand('formatBlock', 'P')} icon={Pilcrow} label="正文" />
                                <MenuBtn onClick={insertCodeBlock} icon={Code} label="代码" />
                                <MenuBtn onClick={insertImage} icon={ImageIcon} label="图片" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div 
                ref={editorRef}
                contentEditable
                className="min-h-[500px] p-8 pl-16 md:pl-24 pr-8 outline-none prose prose-blue max-w-none custom-blog-content"
                onKeyUp={updateActiveBlockPosition}
                onMouseUp={updateActiveBlockPosition}
                onClick={updateActiveBlockPosition}
                onInput={updateActiveBlockPosition}
                onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        document.execCommand('insertText', false, '    ');
                    }
                }}
            >
            </div>
        </div>
        
        <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            悬停左侧 “+” 号以切换格式 | 点击底部空白处可添加新行
        </div>
      </Card>
    </div>
  );
};

const MenuBtn = ({ onClick, icon: Icon, label }) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
        className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 transition-colors w-12 h-12"
        title={label}
    >
        <Icon size={18} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
);

export default BlogEditor;