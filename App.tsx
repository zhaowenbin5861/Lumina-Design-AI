import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Send, 
  MessageSquare, 
  Image as ImageIcon, 
  Loader2, 
  Download,
  RefreshCcw,
  Palette
} from 'lucide-react';
import { CompareSlider } from './components/CompareSlider';
import { generateReimaginedImage, sendMessageToAdvisor, resetChatSession } from './services/geminiService';
import { ChatMessage, DesignStyle } from './types';

// Preset Styles
const STYLES: DesignStyle[] = [
  { id: 'modern', name: 'Modern', previewColor: '#3b82f6', prompt: 'Redesign this room in a sleek Modern style with minimalist furniture, clean lines, and neutral colors with blue accents.' },
  { id: 'scandi', name: 'Scandinavian', previewColor: '#14b8a6', prompt: 'Redesign this room in Scandinavian style, light wood, cozy textures, white walls, airy atmosphere.' },
  { id: 'industrial', name: 'Industrial', previewColor: '#64748b', prompt: 'Redesign this room in Industrial style, exposed brick, metal accents, leather furniture, raw finishes.' },
  { id: 'boho', name: 'Bohemian', previewColor: '#f59e0b', prompt: 'Redesign this room in Bohemian style, plants, patterns, eclectic furniture, warm lighting, cozy rugs.' },
  { id: 'midcen', name: 'Mid-Century', previewColor: '#d97706', prompt: 'Redesign this room in Mid-Century Modern style, teak wood, organic curves, retro colors, statement lighting.' },
];

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOriginalImage(result);
        setGeneratedImage(null); // Reset generated on new upload
        setChatHistory([{
            id: 'init', 
            role: 'model', 
            text: "Hi! I'm your AI Interior Design Consultant. Upload a photo of your room, select a style, or tell me how you'd like to reimagine your space!" 
        }]);
        resetChatSession();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleSelect = async (style: DesignStyle) => {
    if (!originalImage) return;
    
    setIsGenerating(true);
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Generating ${style.name} design...` }]);

    try {
      const result = await generateReimaginedImage(originalImage, style.prompt);
      setGeneratedImage(result);
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Here is a ${style.name} take on your room! Use the slider to compare. You can refine this further by chatting with me below.` }]);
    } catch (error) {
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I had trouble generating that image. Please try again." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    if (!originalImage) {
        setChatHistory(prev => [...prev, 
            { id: Date.now().toString(), role: 'user', text: chatInput },
            { id: (Date.now()+1).toString(), role: 'model', text: "Please upload an image of your room first so I can help you design it!" }
        ]);
        setChatInput('');
        return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
        // Send to Gemini Chat Model
        const response = await sendMessageToAdvisor(userMsg.text, chatHistory);
        
        if (response.toolCall && response.toolCall.name === 'updateRoomDesign') {
            const visualDescription = response.toolCall.args.visualDescription;
            
            // Add a "thinking" message or confirmation
            setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Sure! I'm updating the design: "${visualDescription}"` }]);
            
            // Trigger Image Gen
            setIsGenerating(true);
            // Use current generated image as base if available (iterative editing), or original if major change?
            // "Flash Image" works best with Original + Text Prompt for "Re-styling". 
            // If we use the generated image, it might degrade quality over multiple generations.
            // Let's stick to Original + New Prompt for highest fidelity, unless user explicitly wants to "tweak" the generated one.
            // For this demo, let's always reference the Original Image as the source of truth for the room structure (walls/floor), 
            // but the prompt changes the style. This preserves the room geometry best.
            
            const newImage = await generateReimaginedImage(originalImage, visualDescription);
            setGeneratedImage(newImage);
            setIsGenerating(false);
            
            setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I've updated the visualization based on your request. How does that look?" }]);
        } else if (response.text) {
             setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response.text }]);
        }
    } catch (error) {
        console.error(error);
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I encountered an error. Please try again.", isError: true }]);
        setIsGenerating(false);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Sparkles size={20} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Lumina Design AI</h1>
                <p className="text-xs text-slate-500 font-medium">Powered by Gemini 2.5 & 3.0</p>
            </div>
        </div>
        <div>
            {!originalImage ? (
                <button disabled className="text-slate-400 text-sm font-medium px-4 py-2 border border-dashed border-slate-300 rounded-full">
                    No Image Loaded
                </button>
            ) : (
                <button onClick={() => setOriginalImage(null)} className="text-slate-600 hover:text-red-600 text-sm font-medium px-4 py-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2">
                    <RefreshCcw size={14} /> Start Over
                </button>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left: Visualization Stage (Flexible Height/Width) */}
        <div className="flex-1 bg-slate-900 relative flex flex-col justify-center items-center overflow-hidden">
            {!originalImage ? (
                <div className="text-center p-8 max-w-md animate-fade-in">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <ImageIcon size={32} />
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-3">Visualize Your Space</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Upload a photo of your room to get started. Our AI consultant will help you reimagine the interior style instantly.
                    </p>
                    <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full font-semibold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 group">
                        <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        <span>Upload Room Photo</span>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </label>
                </div>
            ) : (
                <div className="w-full h-full relative">
                    {generatedImage ? (
                        <CompareSlider 
                            original={originalImage} 
                            modified={generatedImage} 
                        />
                    ) : (
                        <div className="w-full h-full relative">
                             <img src={originalImage} alt="Original" className="w-full h-full object-cover opacity-80" />
                             <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                                <h3 className="text-white text-xl font-medium mb-2">Ready to Redesign</h3>
                                <p className="text-white/80 max-w-xs">Select a style below or use the chat to describe your dream room.</p>
                             </div>
                        </div>
                    )}
                    
                    {/* Loading Overlay */}
                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center backdrop-blur-sm animate-fade-in">
                            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-md flex flex-col items-center">
                                <Loader2 className="animate-spin text-indigo-400 mb-4" size={32} />
                                <p className="text-white font-medium">Reimagining your space...</p>
                                <p className="text-indigo-200 text-sm mt-1">Applying visual styles</p>
                            </div>
                        </div>
                    )}

                    {/* Quick Style Selector (Floating) */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-4">
                         <div className="bg-white/90 backdrop-blur-md border border-white/50 p-2 rounded-2xl shadow-xl flex gap-2 overflow-x-auto max-w-full scrollbar-hide">
                            {STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => handleStyleSelect(style)}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap group"
                                    style={{ backgroundColor: isGenerating ? undefined : 'transparent' }}
                                >
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: style.previewColor }}></div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">{style.name}</span>
                                </button>
                            ))}
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Right: Context Aware Chat (Fixed Width on Desktop, Bottom on Mobile) */}
        <div className={`flex flex-col bg-white border-l border-slate-200 ${originalImage ? 'lg:w-[400px] h-[400px] lg:h-auto' : 'hidden'}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-700">
                    <MessageSquare size={18} className="text-indigo-600" />
                    <span className="font-semibold text-sm">Design Consultant</span>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Gemini 3 Pro</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatHistory.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                            } ${msg.isError ? 'border-red-300 bg-red-50 text-red-600' : ''}`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                             <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                             <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Refine design (e.g. 'Make the rug blue')..."
                        disabled={isChatLoading || isGenerating}
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-xl text-sm outline-none transition-all"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading || isGenerating}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="mt-2 text-center">
                   <p className="text-[10px] text-slate-400">
                       Tip: Ask for visual changes or product advice.
                   </p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
