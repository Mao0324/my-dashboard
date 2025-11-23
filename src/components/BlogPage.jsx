import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BookOpen, Edit, Plus, Trash2, ChevronRight, ChevronDown, Calendar, User } from 'lucide-react';
import { Card } from './ui/Card.jsx';     // 添加 .jsx 后缀
import { Button } from './ui/Button.jsx'; // 添加 .jsx 后缀
import BlogEditor from './BlogEditor.jsx'; // 添加 .jsx 后缀

const BlogPage = ({ db, user, onOpenAuth }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedYears, setExpandedYears] = useState({}); // 控制树形展开状态

  // 获取文章列表
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      // 默认选中第一篇
      if (postsData.length > 0 && !selectedPost && !isEditing) {
        setSelectedPost(postsData[0]);
      }
    });
    return () => unsubscribe();
  }, [db]);

  // 处理文章分组 (用于生成树形结构)
  constHVGroupedPosts = () => {
    const groups = {};
    posts.forEach(post => {
      const date = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000) : new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(post);
    });
    return groups;
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // 保存文章 (新增或更新)
  const handleSavePost = async ({ title, content }) => {
    if (!user) return;
    try {
      const postData = {
        title,
        content,
        authorId: user.uid,
        authorName: user.displayName || "匿名",
        updatedAt: new Date()
      };

      if (selectedPost && selectedPost.id && isEditing && selectedPost.authorId === user.uid) {
        // 更新模式
        await updateDoc(doc(db, "posts", selectedPost.id), postData);
      } else {
        // 新增模式
        await addDoc(collection(db, "posts"), {
          ...postData,
          createdAt: new Date()
        });
      }
      setIsEditing(false);
    } catch (e) {
      console.error("保存失败:", e);
      alert("保存失败: " + e.message);
    }
  };

  const handleDeletePost = async (id) => {
    if (window.confirm("确定要删除这篇文章吗？此操作不可恢复。")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        if (selectedPost?.id === id) setSelectedPost(null);
      } catch (e) {
        alert("删除失败");
      }
    }
  };

  const groupedPosts = currentGroupedPosts();

  function currentGroupedPosts() {
      const groups = {};
      posts.forEach(post => {
        const date = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000) : new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        if (!groups[year]) groups[year] = {};
        if (!groups[year][month]) groups[year][month] = [];
        groups[year][month].push(post);
      });
      return groups;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[calc(100vh-120px)] animate-fade-in">
      
      {/* ---kv 左侧侧边栏 (标题树) --- */}
      <Card className="md:col-span-1 h-full overflow-y-auto max-h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
           <h3 className="font-bold text-gray-700 flex items-center gap-2">
             <BookOpen size={18} className="text-blue-500"/> 文章目录
           </h3>
           {user && !isEditing && (
             <Button variant="icon" onClick={() => { setIsEditing(true); setSelectedPost(null); }} title="写文章">
               <Plus size={20} className="text-blue-600"/>
             </Button>
           )}
        </div>

        <div className="space-y-2 flex-1 custom-scrollbar">
          {Object.keys(groupedPosts).sort((a,b) => b-a).map(year => (
            <div key={year} className="select-none">
              <div 
                className="flex items-center gap-2 font-bold text-gray-500 hover:text-blue-600 cursor-pointer py-1"
                onClick={() => toggleYear(year)}
              >
                {expandedYears[year] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                <span>{year}年</span>
              </div>
              
              {expandedYears[year] && (
                <div className="ml-2 border-l border-gray-200 pl-2 space-y-2 mt-1 animate-fade-in">
                  {Object.keys(groupedPosts[year]).sort((a,b) => b-a).map(month => (
                    <div key={month}>
                      <div className="text-xs font-medium text-gray-400 mb-1 ml-2">{month}月</div>
                      <div className="space-y-1">
                        {groupedPosts[year][month].map(post => (
                          <div 
                            key={post.id}
                            onClick={() => { setSelectedPost(post); setIsEditing(false); }}
                            className={`text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors truncate ${
                              selectedPost?.id === post.id && !isEditing 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {post.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {posts.length === 0 && <div className="text-sm text-gray-400 text-center py-4">暂无文章</div>}
        </div>
      </Card>

      {/* --- 右侧内容区 --- */}
      <div className="md:col-span-3 h-full">
        {isEditing ? (
          // 编辑模式
          <BlogEditor 
            onSave={handleSavePost} 
            onCancel={() => setIsEditing(false)} 
            initialData={selectedPost?.authorId === user?.uid ? selectedPost : null}
          />
        ) : selectedPost ? (
          // 阅读模式
          <Card className="h-full overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{selectedPost.title}</h1>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><User size={14}/> {selectedPost.authorName}</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14}/> 
                    {selectedPost.createdAt?.seconds ? new Date(selectedPost.createdAt.seconds * 1000).toLocaleDateString() : ''}
                  </span>
                </div>
                {user && user.uid === selectedPost.authorId && (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setIsEditing(true)} className="!p-1 text-blue-600">
                      <Edit size={16} /> 编辑
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeletePost(selectedPost.id)} className="!p-1 text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* 文章内容渲染区 - 核心样式 */}
            <div 
              className="prose prose-blue max-w-none custom-blog-content"
              dangerouslySetInnerHTML={{ __html: selectedPost.content }}
            />
          </Card>
        ) : (
          // 空状态
          <Card className="h-full flex flex-col items-center justify-center text-gray-400">
            <BookOpen size={64} className="mb-4 opacity-20"/>
            <p className="text-lg">选择左侧文章开始阅读</p>
            {user ? (
              <Button onClick={() => setIsEditing(true)} className="mt-4">写第一篇博客</Button>
            ) : (
              <Button onClick={onOpenAuth} variant="secondary" className="mt-4">登录以写文章</Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default BlogPage;