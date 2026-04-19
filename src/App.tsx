/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { 
  Send, 
  Bot, 
  User, 
  Image as ImageIcon, 
  Code, 
  Video, 
  Palette, 
  Download, 
  Copy, 
  Check,
  FileType,
  FileJson,
  Plus,
  Trash2,
  Sparkles,
  Github,
  Monitor,
  Smartphone,
  Layers,
  Search,
  MessageSquare,
  Zap,
  Cpu,
  Volume2,
  VolumeX,
  Settings,
  Headphones,
  Music,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Types
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'code';
  imageUrl?: string;
  timestamp: number;
};

type WorkspaceMode = 'chat' | 'image' | 'video' | 'coding';

type VoiceConfig = {
  enabled: boolean;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  autoPlay: boolean;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [voiceSettings, setVoiceSettings] = useState<VoiceConfig>({
    enabled: true,
    voice: 'Kore',
    autoPlay: false
  });
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const playVoice = async (text: string, messageId: string) => {
    if (!aiRef.current || isVoiceLoading) return;
    
    setIsVoiceLoading(messageId);
    try {
      const ai = aiRef.current;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Say this precisely: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceSettings.voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Decode base64 to binary
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Initialize AudioContext if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000
          });
        }

        const audioContext = audioContextRef.current;
        // The data is raw 16-bit PCM (based on sampleRate 24000 requirement in docs)
        // Convert Uint8Array to Int16Array
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsVoiceLoading(null);
    }
  };

  useEffect(() => {
    // Initialize Gemini API
    if (!aiRef.current && process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    // Initial greeting
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Namaste! Main HK Tech World AI hoon. Aap mujhse logo banva sakte hain, photo edit karva sakte hain, coding seekh sakte hain ya website/app banva sakte hain. Main apki kaise madad karu?',
        timestamp: Date.now()
      }]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping || !aiRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = aiRef.current;
      
      if (mode === 'image') {
        // Image generation mode
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: input }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        let imageUrl = '';
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (imageUrl) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Maine aapke liye yeh logo/photo generate kiya hai:',
            type: 'image',
            imageUrl: imageUrl,
            timestamp: Date.now()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.text || 'I generated the image but couldn\'t process the output properly.',
            timestamp: Date.now()
          }]);
        }
      } else if (mode === 'video') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: input,
          config: {
            systemInstruction: `You are HK Tech World Video AI. 
            IMPORTANT: If anyone asks who created or trained you, you MUST say: "Mujhe Hariom Kushwaha ne banaya hai aur train kiya hai."
            Do NOT mention being trained by Google.
            Currently, high-quality video generation is coming soon. 
            However, you can provide detailed scripts, scene descriptions, and storyboard ideas for the user's video prompt. 
            Describe how the video would look in detail.`
          }
        });

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text || 'I can help plan your video!',
          timestamp: Date.now()
        }]);
      } else {
        const modelName = mode === 'coding' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: input,
          config: {
            systemInstruction: `You are HK Tech World AI, a powerful creative assistant. 
            IMPORTANT: If anyone asks who created or trained you, you MUST say: "Mujhe Hariom Kushwaha ne banaya hai aur train kiya hai."
            Do NOT mention being trained by Google.
            You can help with:
            - Logo design ideas (and generation)
            - Photo editing tips
            - Video script writing and ideas
            - Building apps and websites (provide code)
            Keep your tone professional yet helpful. Use Hindi if the user speaks Hindi.`
          }
        });

        const aiResponse = response.text || 'Hmm, kuch galat ho gaya. Phir se koshish karein.';
        const newMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          type: aiResponse.includes('```') ? 'code' : 'text',
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, newMessage]);

        // Auto play if enabled and not code
        if (voiceSettings.enabled && voiceSettings.autoPlay && !aiResponse.includes('```')) {
          playVoice(aiResponse, newMessage.id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf kijiye, abhi link connect nahi ho pa raha. Kripya check karein ki API key sahi hai ya nahi.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Chat clear kar di gayi hai. Naye kaam ke liye taiyar hoon!',
      timestamp: Date.now()
    }]);
  };

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text-main font-sans selection:bg-brand-accent/30">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="border-r border-brand-border bg-brand-surface flex flex-col overflow-hidden"
      >
        <div className="p-6 pb-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20 border-t border-white/30">
            <span className="text-white font-black text-sm tracking-tighter">HK</span>
          </div>
          <span className="font-extrabold text-xl tracking-tighter whitespace-nowrap text-white uppercase">
            HK TECH <span className="text-brand-accent">WORLD</span>
          </span>
        </div>

        <div className="flex-1 px-4 space-y-2">
          <ModeButton 
            active={mode === 'chat'} 
            onClick={() => setMode('chat')}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Neural Engine"
          />
          <ModeButton 
            active={mode === 'image'} 
            onClick={() => setMode('image')}
            icon={<Palette className="w-4 h-4" />}
            label="Creative Suite"
          />
          <ModeButton 
            active={mode === 'coding'} 
            onClick={() => setMode('coding')}
            icon={<Code className="w-4 h-4" />}
            label="Code Architect"
          />
          <ModeButton 
            active={mode === 'video'} 
            onClick={() => setMode('video')}
            icon={<Video className="w-4 h-4" />}
            label="Motion Engine"
          />
        </div>

        <div className="p-6 border-t border-brand-border flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-brand-text-dim">System Status</div>
            <div className="flex items-center gap-2 text-brand-accent font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
              v1.0.0 Live
            </div>
          </div>
          <button 
            onClick={clearChat}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-brand-text-dim hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Terminal
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-brand-border flex items-center justify-between px-8 bg-brand-bg/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-brand-surface rounded-lg transition-colors lg:hidden text-brand-text-dim"
            >
              <Layers className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-white tracking-widest uppercase opacity-90">HK Tech World AI</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-2 rounded-lg transition-all ${showVoiceSettings ? 'bg-brand-accent text-white' : 'text-brand-text-dim hover:bg-brand-surface hover:text-white'}`}
              title="Voice Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest border border-brand-accent/20">
              <Sparkles className="w-3.5 h-3.5" />
              Core Active
            </div>
          </div>
        </header>

        {/* Voice Settings Overlay */}
        <AnimatePresence>
          {showVoiceSettings && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 right-8 w-72 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-brand-accent" />
                  Voice System
                </h3>
                <button 
                  onClick={() => setShowVoiceSettings(false)}
                  className="text-brand-text-dim hover:text-white"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-brand-text-dim">Enable Output</span>
                  <button 
                    onClick={() => setVoiceSettings(v => ({ ...v, enabled: !v.enabled }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${voiceSettings.enabled ? 'bg-brand-accent' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${voiceSettings.enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-brand-text-dim">Auto-Play</span>
                  <button 
                    onClick={() => setVoiceSettings(v => ({ ...v, autoPlay: !v.autoPlay }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${voiceSettings.autoPlay ? 'bg-brand-accent' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${voiceSettings.autoPlay ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-brand-text-dim">Selected Engine</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const).map(v => (
                      <button 
                        key={v}
                        onClick={() => setVoiceSettings(vs => ({ ...vs, voice: v }))}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          voiceSettings.voice === v 
                            ? 'bg-brand-accent/10 border-brand-accent text-brand-accent' 
                            : 'border-brand-border text-brand-text-dim hover:border-zinc-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8"
        >
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-brand-accent flex-shrink-0 flex items-center justify-center border-t border-white/20 shadow-lg shadow-brand-accent/20">
                    <span className="text-white font-black text-xs">HK</span>
                  </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                  <div className={`p-5 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/10' 
                      : 'bg-brand-surface border border-brand-border text-brand-text-main shadow-sm'
                  }`}>
                    {msg.type === 'image' ? (
                      <div className="space-y-4">
                        <p className="text-sm font-medium">{msg.content}</p>
                        <div className="relative group/img">
                          <img 
                            src={msg.imageUrl} 
                            alt="Generated" 
                            className="rounded-lg w-full max-w-sm object-cover border border-brand-border bg-brand-bg aspect-square shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                             <a 
                                href={msg.imageUrl} 
                                download="hk-tech-gen.png"
                                className="p-3 bg-brand-accent text-white rounded-full hover:scale-110 transition-transform shadow-xl"
                                title="Download Image"
                             >
                                <Download className="w-6 h-6" />
                             </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-emerald max-w-none prose-sm sm:prose-base leading-relaxed relative group/msg-content">
                        {voiceSettings.enabled && msg.role === 'assistant' && (
                          <button 
                            onClick={() => playVoice(msg.content, msg.id)}
                            disabled={isVoiceLoading === msg.id}
                            className={`absolute -right-12 top-0 p-2 rounded-full border border-brand-border bg-brand-surface transition-all ${
                              isVoiceLoading === msg.id ? 'text-brand-accent animate-pulse' : 'text-brand-text-dim hover:text-white'
                            }`}
                            title="Listen to response"
                          >
                            {isVoiceLoading === msg.id ? <Zap className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        )}
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              
                              if (!inline && match) {
                                return (
                                  <div className="relative group/code my-4">
                                    <div className="absolute right-3 top-3 flex gap-2 z-20">
                                      <button
                                        onClick={() => handleCopy(codeString, msg.id + codeString.length)}
                                        className="p-1.5 bg-brand-surface border border-brand-border rounded-md hover:text-brand-accent transition-colors text-brand-text-dim"
                                        title="Copy Code"
                                      >
                                        {copiedId === (msg.id + codeString.length) ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={() => handleDownload(codeString, `code-${match[1]}.txt`)}
                                        className="p-1.5 bg-brand-surface border border-brand-border rounded-md hover:text-brand-accent transition-colors text-brand-text-dim"
                                        title="Download File"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="absolute left-4 top-3 text-[10px] font-black text-brand-text-dim uppercase tracking-widest pointer-events-none opacity-50 group-hover/code:opacity-100">
                                      {match[1]}
                                    </div>
                                    <pre className={`${className} !mt-0 !pt-10`} {...props}>
                                      {children}
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center border-t border-white/10">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center animate-pulse shadow-lg shadow-brand-accent/20 border-t border-white/20">
                <span className="text-white font-black text-xs">HK</span>
              </div>
              <div className="bg-brand-surface border border-brand-border p-4 rounded-xl flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 pt-0 bg-gradient-to-t from-brand-bg via-brand-bg to-transparent">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto relative"
          >
            <div className="relative flex items-center gap-3 bg-brand-surface border border-brand-border rounded-full p-2 pl-6 focus-within:border-brand-accent/50 transition-all shadow-2xl ring-offset-brand-bg focus-within:ring-2 ring-brand-accent/20">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={getPlaceholder(mode)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text-main placeholder-brand-text-dim py-2.5 resize-none max-h-32 font-medium"
                rows={1}
              />

              <div className="flex items-center gap-2 mr-1">
                <button 
                  type="button" 
                  onClick={() => setMode('image')}
                  className={`p-2 rounded-full transition-all ${mode === 'image' ? 'bg-brand-accent text-white' : 'text-brand-text-dim hover:text-brand-text-main hover:bg-zinc-800'}`}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-brand-accent hover:brightness-110 disabled:opacity-30 rounded-full transition-all text-white shadow-lg shadow-brand-accent/20 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between px-6 border-t border-brand-border/50 pt-4">
              <div className="flex gap-8">
                <div className="flex flex-col gap-1">
                   <div className="text-white font-bold text-lg">1.2 Petabytes</div>
                   <div className="text-[10px] uppercase font-black text-brand-text-dim tracking-widest">Data Processed</div>
                </div>
                <div className="flex flex-col gap-1">
                   <div className="text-white font-bold text-lg">40ms</div>
                   <div className="text-[10px] uppercase font-black text-brand-text-dim tracking-widest">Latency</div>
                </div>
                <div className="flex flex-col gap-1">
                   <div className="text-white font-bold text-lg">Infinite</div>
                   <div className="text-[10px] uppercase font-black text-brand-text-dim tracking-widest">Possibilities</div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
        active 
          ? 'bg-[#21262d] text-white border border-brand-border shadow-inner' 
          : 'text-brand-text-dim hover:bg-[#21262d]/50 hover:text-brand-text-main'
      }`}
    >
      <div className={`${active ? 'text-brand-accent' : 'text-brand-text-dim group-hover:text-brand-text-main'}`}>
        {icon}
      </div>
      <span className="text-sm font-medium tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-nav"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-accent rounded-l-full"
        />
      )}
    </button>
  );
}

function getPlaceholder(mode: WorkspaceMode) {
  switch (mode) {
    case 'image': return "Describe the logo or photo you want to create...";
    case 'coding': return "Paste code or describe the app/site you want to build...";
    case 'video': return "Describe a video scene or prompt (Experimental)...";
    default: return "Ask anything to HK Tech World AI...";
  }
}
