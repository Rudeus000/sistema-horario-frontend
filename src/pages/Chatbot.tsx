import React from 'react';
import Chatbot from '@/components/Chatbot';
import PageHeader from '@/components/PageHeader';

const ChatbotPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="TIMO - Asistente Inteligente"
        description="AI Scheduler Assistant - Consulta información del sistema usando lenguaje natural"
      />
      
      <Chatbot />
    </div>
  );
};

export default ChatbotPage;

