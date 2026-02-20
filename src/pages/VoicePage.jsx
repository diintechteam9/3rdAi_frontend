import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

function VoicePage() {
  const [chatId, setChatId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const res = await api.startVoiceSession();
      if (res.data.success) {
        setChatId(res.data.data.chatId);
      }
    } catch (error) {
      console.error('Failed to initialize voice session:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processAudio();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please allow microphone permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const processAudio = async () => {
    if (!audioChunksRef.current.length || !chatId) return;

    setIsProcessing(true);
    setTranscript('');
    setResponse('');

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64Audio = await blobToBase64(audioBlob);

      const res = await api.processVoice(chatId, base64Audio);

      if (res.data.success) {
        setTranscript(res.data.data.transcribedText);
        setResponse(res.data.data.aiResponse);

        if (res.data.data.audioResponse) {
          const audio = new Audio(
            `data:audio/mp3;base64,${res.data.data.audioResponse}`
          );
          audio.play().catch(err => console.error('Audio play failed:', err));
        }
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      alert('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Voice Chat</h1>

      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          border: '2px dashed #ddd',
          borderRadius: '12px',
          marginBottom: '30px',
        }}
      >
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isRecording ? '#e74c3c' : '#3498db',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          {isProcessing ? '⏳' : isRecording ? '⏹ Stop' : '🎤 Start'}
        </button>

        <p style={{ marginTop: '20px', color: '#7f8c8d' }}>
          {isRecording
            ? 'Recording... Click to stop'
            : isProcessing
            ? 'Processing...'
            : 'Click to start recording'}
        </p>
      </div>

      {transcript && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#e8f4f8',
            borderRadius: '8px',
            marginBottom: '15px',
          }}
        >
          <strong>You said:</strong> {transcript}
        </div>
      )}

      {response && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
          }}
        >
          <strong>AI Response:</strong> {response}
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#7f8c8d' }}>
        <p>💡 Tip: Speak clearly and wait for the AI response before asking again.</p>
        {chatId && <p>Chat ID: {chatId}</p>}
      </div>
    </div>
  );
}

export default VoicePage;
