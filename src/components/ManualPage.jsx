import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Book, FileVideo, ChevronLeft, ChevronRight, Info, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const isVideo = images[currentIndex].src.endsWith('.webp') || images[currentIndex].src.endsWith('.mp4');

    return (
        <div className="relative group my-12 bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-700/50 shadow-2xl ring-1 ring-white/5">
            <div className="relative aspect-video flex items-center justify-center bg-black/40">
                {isVideo && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-xl text-white border border-blue-400/30">
                        <PlayCircle size={14} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Recorrido</span>
                    </div>
                )}
                
                <img 
                    src={images[currentIndex].src} 
                    alt={images[currentIndex].alt} 
                    className="max-w-full max-h-full object-contain transition-all duration-1000 group-hover:scale-105"
                />
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-8 pt-24">
                    <div className="flex items-end justify-between gap-6">
                        <div className="flex-1 text-left">
                            <h4 className="text-white font-black text-xl tracking-tight leading-none mb-2">
                                {images[currentIndex].alt || 'Guía Visual LMA'}
                            </h4>
                            <div className="flex items-center gap-3">
                                <span className="h-1 w-6 bg-blue-500 rounded-full"></span>
                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Operaciones LMA</p>
                            </div>
                        </div>
                        {images.length > 1 && (
                            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700/50 rounded-xl p-1.5 pl-3.5 shadow-xl scale-90">
                                <span className="text-[9px] font-black text-slate-500 uppercase tabular-nums">{currentIndex + 1} / {images.length}</span>
                                <div className="flex gap-1">
                                    <button onClick={handlePrev} className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-blue-600 transition-all"><ChevronLeft size={14}/></button>
                                    <button onClick={handleNext} className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-blue-600 transition-all"><ChevronRight size={14}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {images.length > 1 && (
                <div className="absolute top-1/2 -translate-y-10 left-0 right-0 px-4 flex justify-between pointer-events-none z-30">
                    <button onClick={handlePrev} className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 pointer-events-auto shadow-2xl"><ChevronLeft size={28} /></button>
                    <button onClick={handleNext} className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 pointer-events-auto shadow-2xl"><ChevronRight size={28} /></button>
                </div>
            )}
        </div>
    );
};

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

    const getSafeTextContent = (node) => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(getSafeTextContent).join(' ');
        if (node.props && node.props.children) return getSafeTextContent(node.props.children);
        return '';
    };

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setError(null);
            try {
                const tab = tabs.find(t => t.id === activeTab);
                const response = await fetch(`/docs/manual/${tab.file}`);
                if (!response.ok) throw new Error('No se pudo cargar el archivo');
                let text = await response.text();
                text = text.replace(/\.\/assets\//g, '/docs/manual/assets/');
                
                const lines = text.split('\n');
                const newLines = [];
                let currentGallery = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);

                    if (imgMatch) {
                        currentGallery.push({ alt: imgMatch[1], src: imgMatch[2] });
                    } else {
                        if (currentGallery.length > 0) {
                            if (currentGallery.length >= 2) {
                                const json = JSON.stringify(currentGallery).replace(/'/g, "&apos;");
                                newLines.push(`<gallery data-images='${json}'></gallery>`);
                            } else {
                                newLines.push(`![${currentGallery[0].alt}](${currentGallery[0].src})`);
                            }
                            currentGallery = [];
                        }
                        newLines.push(lines[i]);
                    }
                }
                if (currentGallery.length > 0) {
                    if (currentGallery.length >= 2) {
                        const json = JSON.stringify(currentGallery).replace(/'/g, "&apos;");
                        newLines.push(`<gallery data-images='${json}'></gallery>`);
                    } else {
                        newLines.push(`![${currentGallery[0].alt}](${currentGallery[0].src})`);
                    }
                }

                setContent(newLines.join('\n'));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [activeTab]);

    return (
        <div className="flex flex-col h-full bg-[#0f172a] overflow-hidden text-slate-100 font-sans">
            {/* Header */}
            <header className="flex-none px-6 py-4 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-2xl z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/')} className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 shadow-lg"><ChevronLeft size={20} /></button>
                        <div>
                            <h1 className="text-xl font-black text-white italic tracking-tighter">LMA <span className="text-blue-500">CENTER</span></h1>
                            <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase mt-0.5">Centro de Operaciones</p>
                        </div>
                    </div>
                    <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><tab.icon size={16} />{tab.label}</button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Scrollable Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a]">
                <div className="max-w-4xl mx-auto px-8 py-12 pb-40">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8"><div className="h-12 w-12 border-t-2 border-blue-600 rounded-full animate-spin"></div><p className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Cargando Documentación...</p></div>
                    ) : (
                        <div className="prose prose-invert prose-indigo max-w-none markdown-content">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                    p: ({ children }) => {
                                        const hasBlock = React.Children.toArray(children).some((child) => child && child.type && (typeof child.type === 'string' && ['div', 'gallery'].includes(child.type)));
                                        return hasBlock ? <>{children}</> : <p className="mb-6 text-slate-300 text-lg leading-relaxed">{children}</p>;
                                    },
                                    gallery: ({ node, ...props }) => {
                                        const images = JSON.parse(props['data-images'].replace(/&apos;/g, "'"));
                                        return <ImageCarousel images={images} />;
                                    },
                                    img: ({ node, ...props }) => (
                                        <div className="my-10 rounded-[2rem] overflow-hidden border border-slate-700 shadow-2xl bg-black group relative"><img {...props} className="w-full h-auto" loading="lazy" />{props.alt && <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 text-center uppercase font-black text-[9px] tracking-widest text-slate-500">{props.alt}</div>}</div>
                                    ),
                                    hr: () => <div className="my-12 h-px w-24 bg-blue-600/20 mx-auto rounded-full"></div>,
                                    table: ({ children }) => (
                                        <div className="my-8 overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900/40 backdrop-blur-2xl shadow-xl"><table className="w-full text-left border-collapse">{children}</table></div>
                                    ),
                                    thead: ({ children }) => <thead className="bg-slate-800 border-b border-slate-700">{children}</thead>,
                                    th: ({ children }) => <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{children}</th>,
                                    td: ({ children }) => <td className="px-6 py-4 text-sm font-medium text-slate-300 border-b border-white/5 last:border-0">{children}</td>,
                                    blockquote: ({ children }) => {
                                        const fullText = getSafeTextContent(children);
                                        const types = { '[!TIP]': 'emerald', '[!WARNING]': 'amber', '[!IMPORTANT]': 'blue', '[!CAUTION]': 'red' };
                                        const color = Object.keys(types).find(k => fullText.includes(k)) ? types[Object.keys(types).find(k => fullText.includes(k))] : 'slate';
                                        return (<div className={`my-10 p-6 rounded-[2rem] border border-${color}-500/20 bg-${color}-500/5 relative overflow-hidden group shadow`}><div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`}></div><div className="text-slate-300 text-base leading-relaxed italic">{children}</div></div>);
                                    }
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </main>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 20px; }
                
                .markdown-content blockquote p { display: inline !important; margin: 0 !important; }
                
                .markdown-content h1 { font-size: 2.75rem !important; font-weight: 900 !important; margin-bottom: 2rem !important; color: white !important; text-transform: uppercase; letter-spacing: -0.02em; }
                .markdown-content h2 { font-size: 1.85rem !important; font-weight: 900 !important; margin-top: 3.5rem !important; margin-bottom: 1.25rem !important; color: #3b82f6 !important; }
                .markdown-content h3 { font-size: 1.45rem !important; font-weight: 900 !important; margin-top: 2.5rem !important; margin-bottom: 1rem !important; color: white !important; }
                
                /* List Styles - Forced Visibility */
                .markdown-content ul, .markdown-content ol { 
                    display: block !important;
                    margin: 1.5rem 0 2rem 0 !important; 
                    padding-left: 1.5rem !important; 
                    list-style-position: outside !important;
                }
                
                .markdown-content ul { list-style-type: disc !important; }
                .markdown-content ol { list-style-type: decimal !important; }
                
                .markdown-content li { 
                    display: list-item !important;
                    margin-bottom: 0.75rem !important; 
                    padding-left: 0.5rem !important;
                    color: #cbd5e1 !important;
                    font-size: 1.125rem !important;
                    line-height: 1.6 !important;
                }
                
                .markdown-content li::marker { 
                    color: #3b82f6 !important; 
                    font-weight: 900 !important; 
                }

                /* Ensure spacing between P and LIST */
                .markdown-content p + ul, .markdown-content p + ol {
                    margin-top: 1rem !important;
                }
            `}} />
        </div>
    );
};

export default ManualPage;
