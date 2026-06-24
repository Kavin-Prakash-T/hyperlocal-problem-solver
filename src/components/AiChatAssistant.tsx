import React, { useState, useEffect, useRef } from 'react';
import { 
  db, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from '../lib/firebase';
import { useTranslation } from '../lib/i18n';
import { useToast } from './Toast';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiChatAssistantProps {
  userId: string;
  userName: string;
}

export default function AiChatAssistant({ userId, userName }: AiChatAssistantProps) {
  const { language, t } = useTranslation();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatLang, setChatLang] = useState<string>(language);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync language with application locale
  useEffect(() => {
    setChatLang(language);
  }, [language]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!userId || !isOpen) return;
    
    const loadChatHistory = async () => {
      try {
        const q = query(
          collection(db, 'chatMessages'),
          where('userId', '==', userId),
          orderBy('createdAt', 'asc'),
          limit(30)
        );
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          const loadedMsgs: ChatMessage[] = [];
          querySnap.forEach((doc) => {
            loadedMsgs.push({ id: doc.id, ...(doc.data() as any) } as ChatMessage);
          });
          setMessages(loadedMsgs);
        } else {
          // Add default welcome message
          const welcomeText = getWelcomeText(chatLang);
          setMessages([{
            id: 'welcome',
            userId,
            sender: 'ai',
            content: welcomeText,
            createdAt: Date.now()
          }]);
        }
      } catch (err) {
        console.error("Failed to load chat logs:", err);
        // Fallback to local default welcome if firestore index is not built yet
        setMessages([{
          id: 'welcome',
          userId,
          sender: 'ai',
          content: getWelcomeText(chatLang),
          createdAt: Date.now()
        }]);
      }
    };

    loadChatHistory();
  }, [userId, isOpen, chatLang]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getWelcomeText = (lang: string) => {
    switch (lang) {
      case 'ta':
        return `வணக்கம், ${userName}! நான் உங்களின் "கம்யூனிட்டி ஹீரோ" AI சேவகன். ஏதேனும் புகாரைப் பதிவு செய்யவா, புகாரின் நிலையைக் கண்டறியவா, அல்லது வார்டுகள் பற்றி விளக்கவா?`;
      case 'hi':
        return `नमस्ते, ${userName}! मैं आपका "कम्युनिटी हीरो" AI सहायक हूँ। क्या मैं आपको शिकायत दर्ज करने, टिकट की स्थिति जाँचने, या नगरपालिका सुविधाओं को समझने में मदद करूँ?`;
      default:
        return `Hello, ${userName}! I am your "Community Hero" AI Civic Assistant. I can help you report issues, check complaint statuses, explain which department handles specific problems, or learn about our trust points and achievement badges system!`;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // 1. Save user message locally & to Firestore
    const userMsg: Omit<ChatMessage, 'id'> = {
      userId,
      sender: 'user',
      content: userText,
      createdAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'chatMessages'), userMsg);
      const userMsgWithId: ChatMessage = { id: docRef.id, ...userMsg };
      
      setMessages(prev => [...prev, userMsgWithId]);

      // 2. Fetch AI response from backend proxy
      const response = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsgWithId].map(m => ({
            sender: m.sender,
            content: m.content
          })),
          currentLanguage: chatLang
        })
      });

      if (!response.ok) {
        throw new Error('Gemini API communication error.');
      }

      const data = await response.json();
      const aiReplyText = data.reply;

      // 3. Save AI message to Firestore
      const aiMsg: Omit<ChatMessage, 'id'> = {
        userId,
        sender: 'ai',
        content: aiReplyText,
        createdAt: Date.now()
      };

      const aiDocRef = await addDoc(collection(db, 'chatMessages'), aiMsg);
      setMessages(prev => [...prev, { id: aiDocRef.id, ...aiMsg }]);

    } catch (err) {
      console.error("Failed to process chatbot request:", err);
      toast("Chatbot communication failed. Check your connection.", "error");
      
      const errorMsg: ChatMessage = {
        id: 'error-' + Date.now(),
        userId,
        sender: 'ai',
        content: "I am having trouble connecting to the AI services. Please try again in a few moments.",
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([{
      id: 'welcome',
      userId,
      sender: 'ai',
      content: getWelcomeText(chatLang),
      createdAt: Date.now()
    }]);
    toast("Chat history cleared locally.", "info");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-slate-950 px-4 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Bot className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Civic AI Assistant</h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
                    Powered by Gemini 3.5
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Quick language toggle within assistant */}
                <button 
                  onClick={() => setChatLang(prev => prev === 'en' ? 'ta' : prev === 'ta' ? 'hi' : 'en')}
                  title="Switch Chat Language"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Languages className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                      msg.sender === 'user' 
                        ? 'bg-slate-900 text-white rounded-br-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="block text-[9px] text-right mt-1.5 opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder={chatLang === 'ta' ? 'கேள்வி கேட்கவும்...' : chatLang === 'hi' ? 'सवाल पूछें...' : 'Ask me anything about municipal issues...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 text-slate-950 focus:outline-hidden focus:border-slate-400 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(prev => !prev)}
        className="h-14 w-14 bg-slate-950 hover:bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer border border-slate-800 relative group"
        aria-label="Toggle AI Civic Assistant Chat"
      >
        <span className="absolute right-full mr-3.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          AI Civic Assistant
        </span>
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
