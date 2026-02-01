import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptProps {
  items: TranscriptItem[];
}

export const Transcript: React.FC<TranscriptProps> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide scroll-smooth"
    >
      {items.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-neutral-500">
          <p className="text-center font-medium">Ready to chat.</p>
          <p className="text-center text-sm mt-1 text-neutral-600">Tap the microphone to start.</p>
        </div>
      )}
      
      {items.map((item, index) => (
        <div 
          key={item.id + index} 
          className={`flex w-full ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-1`}>
            
            <div className={`
              px-5 py-3 text-[15px] leading-relaxed shadow-sm backdrop-blur-sm
              ${item.sender === 'user' 
                ? 'bg-indigo-600/90 text-white rounded-2xl rounded-tr-md border border-indigo-500/50' 
                : 'bg-neutral-800/80 text-neutral-100 border border-neutral-700 rounded-2xl rounded-tl-md'}
              ${item.isPartial ? 'opacity-80' : ''}
            `}>
              {item.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};