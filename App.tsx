import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Users, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Attendee, AppState } from './types';
import MicButton from './components/MicButton';
import AttendeeList from './components/AttendeeList';
import { processNameListWithGemini, transcribeAudio } from './services/geminiService';

const App: React.FC = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      
      if (!mimeType) {
        alert('No supported audio mime type found in this browser.');
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setAppState(AppState.TRANSCRIBING);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          const base64Audio = base64String.split(',')[1];
          
          if (base64Audio) {
            try {
              const text = await transcribeAudio(base64Audio, mimeType);
              if (text) {
                handleFinalTranscript(text);
              }
            } catch (err) {
              console.error("Transcription failed", err);
              alert("Failed to transcribe audio.");
            }
          }
          
          setAppState(AppState.IDLE);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };
      };

      recorder.start();
      setAppState(AppState.LISTENING);
      setCurrentTranscript("Listening...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
      setAppState(AppState.IDLE);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // State change to TRANSCRIBING happens in onstop
    }
  };

  const toggleListening = () => {
    if (appState === AppState.LISTENING) {
      stopRecording();
    } else if (appState === AppState.IDLE) {
      startRecording();
    }
  };

  const parseTranscript = (text: string) => {
    const cleaned = text.trim();
    // Simple regex to find the first digit sequence
    // This assumes the user says "Name Number"
    // e.g., "Amy Cooper 1234567890" -> Name: "Amy Cooper", Phone: "1234567890"
    const digitMatch = cleaned.search(/\d/);
    
    if (digitMatch !== -1) {
      const namePart = cleaned.substring(0, digitMatch).trim();
      const phonePart = cleaned.substring(digitMatch).trim();
      // If the name part is empty (e.g. just said a number), keep original text as name for safety
      if (!namePart) {
          return { name: cleaned, phone: '' };
      }
      return { name: namePart, phone: phonePart };
    }
    
    return { name: cleaned, phone: '' };
  };

  const handleFinalTranscript = useCallback((text: string) => {
    const { name, phone } = parseTranscript(text);
    
    if (name.length > 0) {
      const newAttendee: Attendee = {
        id: crypto.randomUUID(),
        rawInput: text,
        formattedName: name, 
        formattedPhone: phone,
        timestamp: Date.now(),
      };
      
      setAttendees(prev => [...prev, newAttendee]);
      setCurrentTranscript(''); 
    }
  }, []);

  const removeAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
  };

  const handleEdit = (id: string, newName: string, newPhone: string) => {
    setAttendees(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          rawInput: `${newName} ${newPhone}`.trim(), 
          formattedName: newName,
          formattedPhone: newPhone
        };
      }
      return a;
    }));
  };

  const handleFinish = async () => {
    setAppState(AppState.PROCESSING);
    
    // 1. Clean names and phones with Gemini
    const processedList = await processNameListWithGemini(attendees);
    setAttendees(processedList);
    
    setAppState(AppState.REVIEW);
  };

  const handleExport = () => {
    setAppState(AppState.SUBMITTING);

    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Name,Phone Number,Timestamp\n"
      + attendees.map(e => `${e.id},"${e.formattedName}","${e.formattedPhone || ''}",${new Date(e.timestamp).toISOString()}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        setAppState(AppState.COMPLETED);
    }, 1000);
  };

  const resetApp = () => {
    setAttendees([]);
    setAppState(AppState.IDLE);
    setCurrentTranscript('');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 shadow-2xl overflow-hidden">
      
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Users size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
                <p className="text-xs text-gray-500">
                    {attendees.length} people recorded
                </p>
            </div>
        </div>
        
        {appState !== AppState.LISTENING && appState !== AppState.TRANSCRIBING && appState !== AppState.PROCESSING && attendees.length > 0 && (
            <button 
                onClick={resetApp}
                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                title="Reset All"
            >
                <RefreshCw size={20} />
            </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Status Indicator / Transcript */}
        <div className={`p-4 text-center transition-colors duration-300 ${appState === AppState.LISTENING ? 'bg-indigo-50' : appState === AppState.TRANSCRIBING ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className={`h-6 font-medium text-lg truncate ${appState === AppState.TRANSCRIBING ? 'text-amber-600' : 'text-indigo-800'}`}>
                {appState === AppState.TRANSCRIBING ? "Transcribing Audio..." : (currentTranscript || "Ready")}
            </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden flex flex-col px-4">
             <AttendeeList 
                attendees={attendees} 
                onRemove={removeAttendee} 
                onEdit={handleEdit}
             />
        </div>

        {/* Bottom Action Area (Sticky) */}
        <div className="bg-white border-t border-gray-200 p-6 flex flex-col items-center gap-4 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            
            {/* Case: Reviewing processed data */}
            {appState === AppState.REVIEW ? (
                 <div className="w-full space-y-3">
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm mb-2 text-center">
                        Data processed. Please review names and phone numbers.
                    </div>
                    <button 
                        onClick={handleExport}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <FileSpreadsheet size={24} />
                        Export to CSV / Submit
                    </button>
                    <button 
                        onClick={() => setAppState(AppState.IDLE)}
                        className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-xl"
                    >
                        Continue Scanning
                    </button>
                 </div>
            ) : appState === AppState.COMPLETED ? (
                 <div className="w-full text-center space-y-4 py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-2">
                        <Download size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Export Complete!</h2>
                    <p className="text-gray-500">The attendance sheet has been downloaded.</p>
                    <button 
                        onClick={resetApp}
                        className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700"
                    >
                        Start New Event
                    </button>
                 </div>
            ) : (
                /* Standard Recording Interface */
                <>
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                        <MicButton 
                            isListening={appState === AppState.LISTENING} 
                            isProcessing={appState === AppState.PROCESSING || appState === AppState.TRANSCRIBING}
                            onClick={toggleListening} 
                        />
                    </div>
                    
                    {/* Spacer for the big button which sits half-out */}
                    <div className="h-12"></div>

                    {attendees.length > 0 && (
                        <button 
                            onClick={handleFinish}
                            disabled={appState === AppState.LISTENING || appState === AppState.PROCESSING || appState === AppState.TRANSCRIBING}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {appState === AppState.PROCESSING ? 'Processing with Gemini...' : `Finish & Process (${attendees.length})`}
                        </button>
                    )}
                </>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
