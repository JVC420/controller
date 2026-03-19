import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Loader2, MessageCircle, Send, User, X } from 'lucide-react';

const SUPPORT_WEBHOOK_URL = '/api/support-webhook';

const INITIAL_BOT_MESSAGE = `Hola 👋, soy tu asistente de LMA.

Cuéntame qué problema estás teniendo en la plataforma y te ayudo a solucionarlo.
Si puedes, inclúyeme algunos detalles como:

* Qué estabas intentando hacer
* Qué pasó exactamente (mensaje de error o comportamiento)
* En qué momento ocurrió

Con esa información puedo ayudarte mucho más rápido 🚑`;

const BOT_REPLY_MESSAGE = `Gracias por la información 🙌

Ya hemos registrado tu caso y un ingeniero lo estará revisando para darte solución lo antes posible. Te estaremos informando cualquier novedad.`;

const typingSpeedMs = 14;

// Now receives user as argument for Authorization
const postSupportMessage = async (message, user) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        let authToken = null;
        if (user && user.getIdToken) {
            authToken = await user.getIdToken();
        }
        const response = await fetch(SUPPORT_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
                message,
                source: 'lma-support-chatbot',
                createdAt: new Date().toISOString(),
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Webhook responded with status ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

const SupportChatbot = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [typingText, setTypingText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [sendError, setSendError] = useState('');

    const listRef = useRef(null);
    const typingIntervalRef = useRef(null);
    const hasSentToWebhookRef = useRef(false);

    const canSend = useMemo(() => {
        return draft.trim().length > 0 && !isTyping;
    }, [draft, isTyping]);

    const scrollToBottom = () => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    };

    const typeBotMessage = (text) => new Promise((resolve) => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }

        setIsTyping(true);
        setTypingText('');

        let index = 0;
        typingIntervalRef.current = setInterval(() => {
            index += 1;
            setTypingText(text.slice(0, index));

            if (index >= text.length) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setMessages((prev) => ([
                    ...prev,
                    {
                        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        role: 'bot',
                        content: text,
                    },
                ]));
                setTypingText('');
                setIsTyping(false);
                resolve();
            }
        }, typingSpeedMs);
    });

    useEffect(() => {
        if (!isOpen || hasInitialized) return;

        let active = true;

        const runInitialMessage = async () => {
            await typeBotMessage(INITIAL_BOT_MESSAGE);
            if (!active) return;
            setHasInitialized(true);
        };

        runInitialMessage();

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, hasInitialized]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingText, isOpen]);

    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
        };
    }, []);

    const handleSend = async (event) => {
        event.preventDefault();
        if (!canSend) return;

        const userText = draft.trim();
        setDraft('');
        setSendError('');

        setMessages((prev) => ([
            ...prev,
            {
                id: `user-${Date.now()}`,
                role: 'user',
                content: userText,
            },
        ]));

        if (!hasSentToWebhookRef.current) {
            hasSentToWebhookRef.current = true;
            try {
                await postSupportMessage(userText, user);
            } catch {
                setSendError('No se pudo enviar el caso al sistema de soporte. Intenta nuevamente.');
                return;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
        await typeBotMessage(BOT_REPLY_MESSAGE);
    };

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            {isOpen && (
                <div className="w-[92vw] sm:w-[380px] h-[560px] max-h-[72vh] bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-700 bg-dark-900/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Asistente LMA</p>
                                <p className="text-[11px] text-slate-400">Soporte operativo</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                            title="Cerrar soporte"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-dark-900/30">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[88%] rounded-2xl px-3 py-2 border ${msg.role === 'user'
                                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-100'
                                    : 'bg-slate-800 border-slate-700 text-slate-100'
                                }`}>
                                    <div className="flex items-center gap-1.5 mb-1 opacity-80 text-[11px]">
                                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                        <span>{msg.role === 'user' ? 'Tú' : 'Asistente'}</span>
                                    </div>
                                    <p className="text-[13px] whitespace-pre-line leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="max-w-[88%] rounded-2xl px-3 py-2 border bg-slate-800 border-slate-700 text-slate-100">
                                    <div className="flex items-center gap-1.5 mb-1 opacity-80 text-[11px]">
                                        <Bot size={12} />
                                        <span>Asistente</span>
                                        <Loader2 size={12} className="animate-spin" />
                                    </div>
                                    <p className="text-[13px] whitespace-pre-line leading-relaxed">
                                        {typingText}
                                        <span className="ml-0.5 inline-block h-3 w-[2px] bg-cyan-300/90 align-middle animate-pulse" />
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-3 border-t border-slate-700 bg-dark-900/40 flex gap-2">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, 1200))}
                            rows={2}
                            placeholder="Describe tu problema aquí..."
                            className="flex-1 bg-dark-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                        />
                        <button
                            type="submit"
                            disabled={!canSend}
                            className="shrink-0 h-11 w-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white grid place-items-center transition-colors"
                            title="Enviar"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                    {sendError && (
                        <p className="px-3 pb-3 text-xs text-red-400">{sendError}</p>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="h-14 w-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-900/35 flex items-center justify-center transition-transform hover:scale-105"
                title="Abrir asistente de soporte"
            >
                <MessageCircle size={22} />
            </button>
        </div>
    );
};

export default SupportChatbot;
