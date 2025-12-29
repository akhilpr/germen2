
import { useState, useRef, useEffect, useCallback } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const speechRecognitionRef = useRef<any | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechRecognitionRef.current = new SpeechRecognition();
      speechRecognitionRef.current.continuous = false;
      speechRecognitionRef.current.interimResults = false;
    } else {
      setError('Speech Recognition API is not supported.');
    }

    speechSynthesisRef.current = window.speechSynthesis;
    const loadVoices = () => {
      voicesRef.current = speechSynthesisRef.current?.getVoices() || [];
    };
    loadVoices();
    speechSynthesisRef.current.onvoiceschanged = loadVoices;

    return () => {
      speechRecognitionRef.current?.abort();
      speechSynthesisRef.current?.cancel();
    };
  }, []);

  const listen = useCallback((lang: string): Promise<string> => {
    if (isListening) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      const recognition = speechRecognitionRef.current;
      if (!recognition) {
        const err = 'Speech Recognition not available.';
        setError(err);
        return reject(err);
      }
      
      recognition.lang = lang;
      recognition.onresult = (event: any) => resolve(event.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        const msg = event.error === 'no-speech' ? 'I didn\'t hear anything.' : `Speech error: ${event.error}`;
        setError(msg);
        reject(new Error(msg));
      };
      
      recognition.start();
      setIsListening(true);
      setError(null);
    });
  }, [isListening]);

  const speak = useCallback((text: string, lang: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!speechSynthesisRef.current) {
        return reject("Speech Synthesis not available.");
      }
      if (speechSynthesisRef.current.speaking) {
        speechSynthesisRef.current.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      
      const germanVoice = voicesRef.current.find(v => v.lang === 'de-DE' && v.name.toLowerCase().includes('google')) || voicesRef.current.find(v => v.lang === 'de-DE');
      if (germanVoice) utterance.voice = germanVoice;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setError(`Speech error: ${event.error}`);
        reject(event.error);
      };

      speechSynthesisRef.current.speak(utterance);
    });
  }, []);

  const stop = useCallback(() => {
    if (isListening) speechRecognitionRef.current?.stop();
    if (isSpeaking) speechSynthesisRef.current?.cancel();
  }, [isListening, isSpeaking]);

  return { isListening, isSpeaking, error, listen, speak, stop };
};
