import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, HelpCircle } from 'lucide-react';
import client from '@/utils/axiosClient';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  data?: any;
  queryType?: string;
}

interface ChatbotProps {
  className?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ className }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '¡Hola! 👋 Soy TIMO, tu asistente inteligente del sistema de horarios. Puedo ayudarte a consultar aulas disponibles, docentes libres, horarios, estadísticas y mucho más. ¿En qué te puedo ayudar?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Scroll automático al final cuando hay nuevos mensajes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Agregar mensaje del usuario
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await client.post('/chatbot/chat/', {
        message: userMessage,
        conversation_id: '',
      });

      const data = response.data;
      
      // El backend ya formatea todo en el campo 'message', solo usarlo directamente
      // NO agregar datos crudos porque el backend ya los formateó en lenguaje natural
      const botContent = data.message || 'No pude generar una respuesta.';

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botContent,
        timestamp: new Date(),
        data: data.data, // Mantener datos por si se necesitan en el futuro, pero no mostrarlos
        queryType: data.query_type,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Error en chatbot:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: error.response?.data?.message || 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // Enfocar el input de nuevo
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleHelp = async () => {
    try {
      const response = await client.get('/chatbot/help/');
      const helpData = response.data;
      
      const helpMsg: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: helpData.message || 'Aquí tienes algunos ejemplos de lo que puedes preguntar.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, helpMsg]);
    } catch (error) {
      console.error('Error obteniendo ayuda:', error);
    }
  };

  return (
    <Card className={cn("flex flex-col h-[calc(100vh-8rem)] max-h-[800px]", className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <img 
                src="/image/timo-logo.jpg" 
                alt="TIMO AI Scheduler Assistant"
                className="w-full h-full object-contain"
                style={{ display: 'block' }}
                onError={(e) => {
                  // Fallback al icono Bot si la imagen no se carga
                  console.warn('No se pudo cargar el logo TIMO, usando fallback');
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.logo-fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
                onLoad={() => {
                  // Ocultar el fallback si la imagen carga correctamente
                  const fallback = document.querySelector('.logo-fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'none';
                  }
                }}
              />
              <div className="p-2 rounded-full bg-primary/10 hidden logo-fallback absolute inset-0 items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg">TIMO - Asistente de Horarios</CardTitle>
              <p className="text-xs text-muted-foreground">
                AI Scheduler Assistant • {user?.username || 'Usuario'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHelp}
            title="Ayuda"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'bot' && (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      <img 
                        src="/image/timo-logo.jpg" 
                        alt="TIMO"
                        className="w-full h-full object-contain"
                        style={{ display: 'block' }}
                        onError={(e) => {
                          // Fallback al icono Bot si la imagen no se carga
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const botIcon = target.parentElement?.querySelector('.bot-icon-fallback');
                          if (botIcon) {
                            (botIcon as HTMLElement).style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          // Ocultar el fallback si la imagen carga correctamente
                          const botIcon = document.querySelector('.bot-icon-fallback');
                          if (botIcon) {
                            (botIcon as HTMLElement).style.display = 'none';
                          }
                        }}
                      />
                      <Bot className="w-4 h-4 text-primary bot-icon-fallback hidden absolute" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.type === 'bot' ? (
                      <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({node, ...props}) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                              </div>
                            ),
                            thead: ({node, ...props}) => (
                              <thead className="bg-gray-100 dark:bg-gray-800" {...props} />
                            ),
                            th: ({node, ...props}) => (
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold text-xs" {...props} />
                            ),
                            td: ({node, ...props}) => (
                              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs" {...props} />
                            ),
                            tr: ({node, ...props}) => (
                              <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50" {...props} />
                            ),
                            p: ({node, ...props}) => (
                              <p className="mb-2 last:mb-0" {...props} />
                            ),
                            ul: ({node, ...props}) => (
                              <ul className="list-disc pl-5 my-2" {...props} />
                            ),
                            ol: ({node, ...props}) => (
                              <ol className="list-decimal pl-5 my-2" {...props} />
                            ),
                            li: ({node, ...props}) => (
                              <li className="my-1" {...props} />
                            ),
                            strong: ({node, ...props}) => (
                              <strong className="font-semibold" {...props} />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    {message.queryType && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {message.queryType}
                      </Badge>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden relative">
                  <img 
                    src="/image/timo-logo.jpg" 
                    alt="TIMO"
                    className="w-full h-full object-contain"
                    style={{ display: 'block' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const botIcon = target.parentElement?.querySelector('.bot-icon-fallback');
                      if (botIcon) {
                        (botIcon as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <Bot className="w-4 h-4 text-primary bot-icon-fallback hidden absolute" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta algo sobre el sistema de horarios..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Puedes preguntar en lenguaje natural. Ejemplo: "¿Qué aulas están disponibles el lunes a las 8?"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chatbot;

