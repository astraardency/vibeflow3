import React, { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { usePlayer } from '../contexts/PlayerContext';
import { searchSongs } from '../services/musicService';
import './VoiceAssistant.css';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  const recognitionRef = useRef(null);
  
  const { playSong, togglePlay, playNextSong, playPreviousSong, audioRef } = usePlayer();

  useEffect(() => {
    // Web implementation
    if (!Capacitor.isNativePlatform()) {
      const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (WebSpeechRecognition) {
        recognitionRef.current = new WebSpeechRecognition();
        recognitionRef.current.continuous = false; // Stop after one command
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setToastMessage('Listening...');
        };

        recognitionRef.current.onresult = async (event) => {
          const current = event.resultIndex;
          const result = event.results[current][0].transcript;
          setTranscript(result);
          await processCommand(result.toLowerCase());
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setToastMessage(`Error: ${event.error}`);
          setTimeout(() => setToastMessage(''), 3000);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setTimeout(() => {
            setToastMessage(prev => (prev === 'Listening...' ? '' : prev));
          }, 3000);
        };
      }
    }

    return () => {
      if (!Capacitor.isNativePlatform() && recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleMicClick = async () => {
    if (isListening) {
      if (Capacitor.isNativePlatform()) {
        try {
          await SpeechRecognition.stop();
        } catch (e) {
          console.error('Stop error', e);
        }
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setTranscript('');
    setIsListening(true);
    setToastMessage('Listening...');

    if (Capacitor.isNativePlatform()) {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) {
          setToastMessage('Speech recognition not available on this device.');
          setIsListening(false);
          return;
        }

        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }

        SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Say a command (e.g. "Play Blinding Lights")',
          partialResults: false,
          popup: false
        });

        SpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            const result = data.matches[0];
            setTranscript(result);
            processCommand(result.toLowerCase());
            SpeechRecognition.stop();
            setIsListening(false);
            SpeechRecognition.removeAllListeners();
          }
        });

      } catch (e) {
        console.error('Native speech error', e);
        setToastMessage('Could not start voice recognition.');
        setIsListening(false);
      }
    } else {
      // Web fallback
      if (!recognitionRef.current) {
        setToastMessage("Browser doesn't support voice recognition.");
        setIsListening(false);
        return;
      }
      try {
        recognitionRef.current.start();
      } catch(e) {
         console.error('Error starting web recognition:', e);
         recognitionRef.current.stop();
      }
    }
  };

  const processCommand = async (commandText) => {
    setToastMessage(`Heard: "${commandText}"`);

    if (commandText.includes('play') || commandText.includes('search')) {
      let query = commandText.replace('play', '').replace('search', '').trim();
      query = query.replace('the song', '').trim();

      if (query) {
        if (query === 'next' || query === 'next song') {
          playNextSong();
          setToastMessage('Playing next song');
        } else if (query === 'previous' || query === 'previous song') {
          playPreviousSong();
          setToastMessage('Playing previous song');
        } else {
          setToastMessage(`Searching for "${query}"...`);
          try {
            const results = await searchSongs(query, 5);
            if (results && results.songs && results.songs.length > 0) {
              const topResult = results.songs[0];
              playSong(topResult);
              setToastMessage(`Playing: ${topResult.title}`);
            } else {
              setToastMessage(`Could not find "${query}"`);
            }
          } catch (error) {
            console.error('Search error via voice:', error);
            setToastMessage('Error searching for song');
          }
        }
      } else {
         togglePlay(true);
         setToastMessage('Resuming playback');
      }
    } 
    else if (commandText.includes('pause') || commandText.includes('stop') || commandText.includes('wait')) {
      togglePlay(false);
      setToastMessage('Paused playback');
    } 
    else if (commandText.includes('resume') || commandText.includes('continue')) {
      togglePlay(true);
      setToastMessage('Resuming playback');
    } 
    else if (commandText.includes('next') || commandText.includes('skip')) {
      playNextSong();
      setToastMessage('Skipping to next song');
    } 
    else if (commandText.includes('previous') || commandText.includes('back')) {
      playPreviousSong();
      setToastMessage('Going back to previous song');
    } 
    else if (commandText.includes('volume up') || commandText.includes('louder')) {
      if (audioRef && audioRef.current && !Capacitor.isNativePlatform()) {
        const newVolume = Math.min(1, audioRef.current.volume + 0.2);
        audioRef.current.volume = newVolume;
        setToastMessage(`Volume: ${Math.round(newVolume * 100)}%`);
      }
    } 
    else if (commandText.includes('volume down') || commandText.includes('softer') || commandText.includes('quieter')) {
      if (audioRef && audioRef.current && !Capacitor.isNativePlatform()) {
        const newVolume = Math.max(0, audioRef.current.volume - 0.2);
        audioRef.current.volume = newVolume;
        setToastMessage(`Volume: ${Math.round(newVolume * 100)}%`);
      }
    }
    
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  return (
    <>
      {toastMessage && (
        <div className="voice-assistant-toast">
          {toastMessage}
        </div>
      )}
      <button 
        className={`voice-assistant-fab ${isListening ? 'listening' : ''}`} 
        onClick={handleMicClick}
        aria-label="Voice Assistant"
      >
        <Mic size={24} color="#ffffff" />
        {isListening && <span className="listening-pulse"></span>}
      </button>
    </>
  );
};

export default VoiceAssistant;
