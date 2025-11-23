import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BookOpen, Edit, Plus, Trash2, ChevronRight, ChevronDown, Calendar, User, ArrowLeft, Clock } from 'lucide-react';
// 修正引用路径
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import BlogEditor from './BlogEditor';

const BlogPage = ({ db, user, onOpenAuth }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'read' | 'edit'
  const [expandedYears, setExpandedYears] = useState({}); 

  // 获取文章列表
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      
      // 默认展开最新年份
      if (postsData.length > 0) {
        const latestDate = postsData[0].createdAt?.seconds ? new Date(postsData[0].createdAt.seconds * 1000) : new Date();
        setExpandedYears(prev => ({ ...prev, [latestDate.getFullYear()]: true }));
      }
    });
    return () => unsubscribe();
  }, [db]);

  // 文章分组逻辑
  const groupedPosts = useMemo(() => {
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
  }, [posts]);

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // 提取纯文本摘要
  const getSummary = (html) => {
    if (!html) return "暂无内容";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || "";
    return text.slice(0, 120) + (text.length > 120 ? "..." : "");
  };

  // 处理器
  const handlePostClick = (post) => {
    setSelectedPost(post);
    setViewMode('read');
  };

  const handleCreateClick = () => {
    setSelectedPost(null);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setSelectedPost(null);
    setViewMode('list');
  };

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

      if (selectedPost && selectedPost.id && viewMode === 'edit' && selectedPost.authorId === user.uid) {
        await updateDoc(doc(db, "posts", selectedPost.id), postData);
        setSelectedPost({ ...selectedPost, ...postData });
      } else {
        const docRef = await addDoc(collection(db, "posts"), {
          ...postData,
          createdAt: new Date()
        });
        setSelectedPost({ id: docRef.id, ...postData, createdAt: { seconds: Date.now() / 1000 } });
      }
      setViewMode('read');
    } catch (e) {
      console.error("保存失败:", e);
      alert("保存失败: " + e.message);
    }
  };

  const handleDeletePost = async (id, e) => {
    e?.stopPropagation();
    if (window.confirm("确定要删除这篇文章吗？")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        if (selectedPost?.id === id) {
          setSelectedPost(null);
          setViewMode('list');
        }
      } catch (err) {
        alert("删除失败");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[calc(100vh-140px)] animate-fade-in">
      
      {/* --- 左侧侧边栏 (目录) --- */}
      <Card className="md:col-span-1 h-full overflow-y-auto max-h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
           <h3 className="font-bold text-gray-700 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleBackToList}>
             <BookOpen size={18} className="text-blue-500"/> 博客归档
           </h3>
           {user && viewMode !== 'edit' && (
             <Button variant="icon" onClick={handleCreateClick} title="写新文章">
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
                            onClick={() => handlePostClick(post)}
                            className={`text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors truncate group flex justify-between items-center ${
                              selectedPost?.id === post.id && viewMode !== 'list'
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{post.title}</span>
                            {user && user.uid === post.authorId && (
                               <span onClick={(e) => handleDeletePost(post.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1">
                                 <Trash2 size={12} />
                               </span>
                            )}
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

      {/* --- 右侧主区域 --- */}
      <div className="md:col-span-3 h-full">
        {viewMode === 'list' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">最新文章</h2>
                {user && (
                  <Button onClick={handleCreateClick}>
                    <Plus size={16}/> 写文章
                  </Button>
                )}
             </div>
             <div className="grid grid-cols-1 gap-4">
                {posts.map(post => (
                  <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer group border border-transparent hover:border-blue-100">
                    <div onClick={() => handlePostClick(post)}>
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 mb-2 transition-colors">{post.title}</h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4 font-serif leading-relaxed">
                        {getSummary(post.content)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><User size={12}/> {post.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12}/> 
                          {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
                {posts.length === 0 && (
                  <div className="text-center py-20 text-gray-400 bg-white/50 rounded-2xl">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>还没有人发布文章，来做第一个吧！</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {viewMode === 'edit' && (
          <BlogEditor 
            onSave={handleSavePost} 
            onCancel={() => selectedPost ? setViewMode('read') : setViewMode('list')} 
            initialData={selectedPost}
          />
        )}

        {viewMode === 'read' && selectedPost && (
          <Card className="h-full overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar animate-fade-in relative">
            <button onClick={handleBackToList} className="absolute top-6 left-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600 md:hidden">
               <ArrowLeft size={20} />
            </button>
            
            <div className="border-b border-gray-100 pb-4 mb-6 mt-2 md:mt-0">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">{selectedPost.title}</h1>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                    <User size={12}/> {selectedPost.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14}/> 
                    {selectedPost.createdAt?.seconds ? new Date(selectedPost.createdAt.seconds * 1000).toLocaleDateString() : ''}
                  </span>
                </div>
                {user && user.uid === selectedPost.authorId && (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setViewMode('edit')} className="!p-1 text-blue-600">
                      <Edit size={16} /> 编辑
                    </Button>
                    <Button variant="ghost" onClick={(e) => handleDeletePost(selectedPost.id, e)} className="!p-1 text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              className="prose prose-blue prose-lg max-w-none custom-blog-content pb-10"
              dangerouslySetInnerHTML={{ __html: selectedPost.content }}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default BlogPage;