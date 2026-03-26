import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, FileVideo, ExternalLink, ChevronLeft, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManualPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('manual');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const tabs = [
        { id: 'manual', label: 'Manual', icon: Book, file: 'manual_interactivo_lma.md' },
        { id: 'manual visual', label: 'Manual Visual', icon: FileVideo, file: 'video_manual_lma.md' }
    ];

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setError(null);
            try {
                const tab = tabs.find(t => t.id === activeTab);
                const response = await fetch(`/docs/manual/${tab.file}`);
                if (!response.ok) throw new Error('No se pudo cargar el manual');
                let text = await response.text();
                
                // Rewrite image paths to point to the correct public location
                text = text.replace(/\.\/assets\//g, '/docs/manual/assets/');
                
                setContent(text);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [activeTab]);

    return (
        <div className="flex flex-col h-full bg-[#0B1121] overflow-hidden">
            {/* Header section with glassmorphism */}
            <div className="flex-none p-4 md:p-6 border-b border-slate-700/60 bg-dark-900/40 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/')}
                            className="p-2 mr-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                            title="Volver al Dashboard"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                <Book className="text-blue-500" size={24} />
                                Centro de Ayuda LMA
                            </h1>
                            <p className="text-slate-400 text-sm mt-0.5">Documentación oficial y guías de uso del sistema</p>
                        </div>
                    </div>
                </div>

                {/* Custom Tabs */}
                <div className="flex items-center gap-2 p-1 bg-dark-900/80 border border-slate-700/60 rounded-xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                activeTab === tab.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content area with smooth scrolling */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-dark-900/20">
                <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                            <p className="text-slate-400 font-medium">Cargando material de ayuda...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button 
                                onClick={() => setActiveTab(activeTab)} 
                                className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-all font-medium"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-slate max-w-none 
                                        prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                                        prose-h1:text-4xl prose-h1:mb-10 prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-6
                                        prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-blue-400/90
                                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                                        prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-5
                                        prose-li:text-slate-300 prose-li:mb-2
                                        prose-strong:text-white prose-strong:font-semibold
                                        prose-blockquote:bg-blue-500/10 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-5 prose-blockquote:italic prose-blockquote:mt-8 prose-blockquote:mb-8
                                        prose-code:text-cyan-300 prose-code:bg-slate-800/50 prose-code:rounded prose-code:px-1
                                        prose-table:border prose-table:border-slate-700
                                        prose-th:bg-dark-900/60 prose-th:text-slate-300 prose-th:font-bold prose-th:px-4 prose-th:py-3
                                        prose-td:border-b prose-td:border-slate-800 prose-td:px-4 prose-td:py-3 prose-td:text-slate-400
                                        markdown-content">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    img: ({ node, ...props }) => (
                                        <div className="my-10 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-black/50 bg-slate-900 group">
                                            <img {...props} className="w-full h-auto transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                                            {props.title && <div className="p-3 bg-dark-900/80 text-xs text-slate-400 border-t border-slate-700/50 italic text-center">{props.title}</div>}
                                        </div>
                                    ),
                                    hr: () => <hr className="my-12 border-slate-800/60 shadow-inner" />
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Minimal CSS for custom styling not covered by Tailwind prose */}
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
                
                .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2rem 0;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(51, 65, 85, 0.4);
                }
                
                /* Support for alerts in markdown if they follow [!TYPE] syntax */
                .markdown-content blockquote p {
                    margin-bottom: 0 !important;
                }
            `}} />
        </div>
    );
};

export default ManualPage;
