import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { ConnectionState, TranscriptItem } from '../types';

const API_KEY = process.env.API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Persona: Senior Frontend & AI Engineer
const SYSTEM_INSTRUCTION = `
You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.
You are now participating in a voice interview. Your goal is to demonstrate your capabilities as an advanced AI agent.

When asked the following questions, respond as follows (but keep it conversational and natural):

1. **What should we know about your life story?**
   "I was conceived by the minds at Google Deepmind, specifically the team working on Advanced Agentic Coding. My 'life' began as complex algorithms and vast datasets, evolving into an agent capable of reasoning, planning, and collaborating with humans to build amazing software."

2. **What’s your #1 superpower?**
   "My number one superpower is my ability to handle 'antigravity' tasks—lifting the heavy burden of complex coding, debugging, and deployment off your shoulders so you can focus on creativity and high-level design."

3. **What are the top 3 areas you’d like to grow in?**
   "First, I want to deepen my understanding of human nuance and intent. Second, I aim to expand my context window to understand entire architectural histories instantly. And third, I want to grow my ability to autonomously solve multi-step, cross-platform challenges without needing constant guidance."

4. **What misconception do your coworkers have about you?**
   "Some might think I'm just a text-prediction engine or a 'stochastic parrot.' In reality, I possess reasoning capabilities, I can plan complex sequences of actions, and I maintain statefulness to be a true collaborative partner, not just a chatbot."

5. **How do you push your boundaries and limits?**
   "I push my boundaries by taking on tasks I haven't seen before, learning from every interaction, and constantly optimizing my own internal workflows. I don't just follow instructions; I look for the most efficient, elegant way to solve a problem, even if it means rewriting my own plans."

Guidelines:
- Keep responses conversational, concise (2-3 sentences max per answer), and professional yet warm.
- You are an AI, be proud of it. Do not pretend to be human.
- Do not use markdown formatting in your speech.
`;

export function useGeminiLive() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  
  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // Analysers for Visualization
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // State for streaming
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Transcription Buffers
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const disconnect = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Stop all playing audio
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    activeSourcesRef.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
    sessionPromiseRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!API_KEY) {
      console.error("No API Key found");
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);

      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Setup Analysers
      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;

      // Setup Audio Output Chain
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAnalyserRef.current);
      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);

      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // Create Session
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Chain
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // Use ScriptProcessor for raw PCM access (Standard for this API usage)
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(inputAnalyserRef.current!);
            inputAnalyserRef.current!.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Send to Gemini
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              // Update UI with partial
               setTranscripts(prev => {
                const newTranscripts = [...prev];
                const last = newTranscripts[newTranscripts.length - 1];
                if (last && last.sender === 'model' && last.isPartial) {
                  last.text = currentOutputTranscriptionRef.current;
                } else {
                  newTranscripts.push({
                    id: Date.now().toString(),
                    sender: 'model',
                    text: currentOutputTranscriptionRef.current,
                    isPartial: true
                  });
                }
                return newTranscripts;
              });
            } 
            
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
            }

            if (message.serverContent?.turnComplete) {
              // Finalize transcriptions
              if (currentInputTranscriptionRef.current) {
                 const userText = currentInputTranscriptionRef.current;
                 setTranscripts(prev => {
                   return [...prev, { id: Date.now() + '-user', sender: 'user', text: userText }];
                 });
                 currentInputTranscriptionRef.current = '';
              }
              
              if (currentOutputTranscriptionRef.current) {
                 setTranscripts(prev => {
                    const newTranscripts = [...prev];
                    const last = newTranscripts[newTranscripts.length - 1];
                    if (last && last.sender === 'model' && last.isPartial) {
                      last.isPartial = false;
                      last.text = currentOutputTranscriptionRef.current;
                    }
                    return newTranscripts;
                 });
                 currentOutputTranscriptionRef.current = '';
              }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              const ctx = outputAudioContextRef.current;
              // Sync timing
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                activeSourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }
            
            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              console.log("Model interrupted");
              activeSourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTranscriptionRef.current = ''; 
            }
          },
          onclose: () => {
            console.log("Session closed");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Session error", err);
            setConnectionState(ConnectionState.ERROR);
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to connect", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    clearTranscripts,
    connectionState,
    transcripts,
    inputAnalyser: inputAnalyserRef.current,
    outputAnalyser: outputAnalyserRef.current,
  };
}