import React, { useState, useRef, useEffect } from 'react';
import { Save, Image as ImageIcon, Code, Link as LinkIcon, Type, Plus, X, Heading1, Heading2, Heading3, Pilcrow } from 'lucide-react';
// 修正引用路径为相对路径，与项目其他组件保持一致
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const BlogEditor = ({ onSave, onCancel, initialData = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 悬浮菜单状态
  const [activeBlockTop, setActiveBlockTop] = useState(0);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [showPlusBtn, setShowPlusBtn] = useState(false);

  useEffect(() => {
    if (initialData?.content && editorRef.current) {
      editorRef.current.innerHTML = initialData.content;
    } else if (editorRef.current && editorRef.current.innerHTML === "") {
      // 默认插入一个段落，方便定位
      editorRef.current.innerHTML = "<p><br/></p>";
    }
  }, [initialData]);

  // 监听光标位置，定位悬浮按钮
  const updateActiveBlockPosition = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    // 如果是文本节点，取父级
    if (node.nodeType === 3) node = node.parentNode;
    
    // 向上查找直到找到编辑器的一级子元素（Block）
    while (node && node.parentNode !== editorRef.current) {
      node = node.parentNode;
    }

    if (node && editorRef.current.contains(node)) {
      // 计算相对编辑器的偏移量
      const offsetTop = node.offsetTop;
      setActiveBlockTop(offsetTop);
      setShowPlusBtn(true);
    } else {
      setShowPlusBtn(false);
      setShowFloatingMenu(false); // 失去焦点时隐藏菜单
    }
  };

  // 执行编辑命令
  const execCommand = (command, value = null) => {
    // 恢复焦点防止命令失效
    if(editorRef.current) editorRef.current.focus();
    document.execCommand(command, false, value);
    updateActiveBlockPosition(); // 更新位置
    setShowFloatingMenu(false); // 操作后隐藏菜单
  };

  // 插入代码块
  const insertCodeBlock = () => {
    const codeHtml = `
      <div class="my-4 relative group">
        <pre class="bg-gray-100 text-gray-800 p-4 rounded-lg border-l-4 border-blue-500 font-mono text-sm overflow-x-auto shadow-sm"><code>在此处输入代码...</code></pre>
      </div><p><br/></p>
    `;
    execCommand('insertHTML', codeHtml);
  };

  // 插入图片
  const insertImage = () => {
    const url = prompt("请输入图片链接 (URL):");
    if (url) {
      const caption = prompt("请输入图片备注 (可选):") || "";
      const imgHtml = `
        <div class="my-6 text-center group">
          <img src="${url}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" />
          ${caption ? `<p class="text-gray-500 text-xs mt-2 italic">${caption}</p>` : ''}
        </div><p><br/></p>
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

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      {/* 顶部：仅标题和发布 */}
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
        
        {/* 编辑区域容器 */}
        <div className="relative flex-1 overflow-y-auto custom-scrollbar">
            
            {/* 悬浮操作栏 (左侧 Gutter) */}
            {showPlusBtn && (
                <div 
                    className="absolute left-4 md:left-10 z-20 transition-all duration-100 flex items-center"
                    style={{ top: activeBlockTop + 4 }} // 微调对齐
                >
                    {/* 加号按钮 */}
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

                        {/* 悬浮菜单 */}
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

            {/* 实际编辑区域 */}
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
                {/* 初始占位，确保有高度 */}
            </div>
        </div>
        
        <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            悬停左侧 “+” 号以切换格式 | 选中文字可进行加粗等操作
        </div>
      </Card>
    </div>
  );
};

// 辅助组件：菜单按钮
const MenuBtn = ({ onClick, icon: Icon, label }) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }} // 防止失去焦点
        className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 transition-colors w-12 h-12"
        title={label}
    >
        <Icon size={18} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
);

export default BlogEditor;