import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Users, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Attendee, AppState } from './types';
import MicButton from './components/MicButton';
import AttendeeList from './components/AttendeeList';
import { processNameListWithGemini } from './services/geminiService';

// Speech Recognition Type Definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  // Refs for speech recognition management
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Keep listening
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          handleFinalTranscript(finalTranscript);
        } else {
            setCurrentTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone access denied. Please allow microphone permissions.");
            setAppState(AppState.IDLE);
        }
      };

      recognitionRef.current.onend = () => {
        // If we are supposed to be listening, restart (unless manually stopped)
        if (appState === AppState.LISTENING) {
          try {
            recognitionRef.current.start();
          } catch (e) {
             // Ignore start errors
          }
        }
      };
    } else {
      alert("Your browser does not support Speech Recognition. Please use Chrome or Safari.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only init once on mount

  // Watch state changes to start/stop mic
  useEffect(() => {
    if (appState === AppState.LISTENING) {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        // Already started
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [appState]);

  const handleFinalTranscript = useCallback((text: string) => {
    const cleanedText = text.trim();
    if (cleanedText.length > 0) {
      // Add new attendee
      const newAttendee: Attendee = {
        id: crypto.randomUUID(),
        rawInput: cleanedText,
        formattedName: cleanedText, // Initial value, cleaned later by Gemini
        timestamp: Date.now(),
      };
      
      setAttendees(prev => [...prev, newAttendee]);
      setCurrentTranscript(''); // Clear interim
    }
  }, []);

  const toggleListening = () => {
    if (appState === AppState.LISTENING) {
      setAppState(AppState.IDLE);
    } else {
      setAppState(AppState.LISTENING);
    }
  };

  const removeAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
  };

  const handleEdit = (id: string, newName: string) => {
    setAttendees(prev => prev.map(a => {
      if (a.id === id) {
        // Update both rawInput and formattedName to ensure persistence
        // regardless of when the edit happens (before or after processing)
        return { ...a, rawInput: newName, formattedName: newName };
      }
      return a;
    }));
  };

  const handleFinish = async () => {
    setAppState(AppState.PROCESSING);
    
    // 1. Clean names with Gemini
    const processedList = await processNameListWithGemini(attendees);
    setAttendees(processedList);
    
    setAppState(AppState.REVIEW);
  };

  const handleExport = () => {
    setAppState(AppState.SUBMITTING);

    // 2. Mock Backend Submission / Generate CSV
    // "Decide which will be better... at last when whole everyone has given the name"
    // RATIONALE: Bulk upload is more robust for events with spotty wifi.
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Original Input,Formatted Name,Timestamp\n"
      + attendees.map(e => `${e.id},"${e.rawInput}","${e.formattedName}",${new Date(e.timestamp).toISOString()}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Simulate backend delay
    setTimeout(() => {
        setAppState(AppState.COMPLETED);
    }, 1000);
  };

  const resetApp = () => {
    setAttendees([]);
    setAppState(AppState.IDLE);
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
        
        {appState !== AppState.LISTENING && appState !== AppState.PROCESSING && attendees.length > 0 && (
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
        <div className={`p-4 text-center transition-colors duration-300 ${appState === AppState.LISTENING ? 'bg-indigo-50' : 'bg-gray-50'}`}>
            <p className="h-6 text-indigo-800 font-medium text-lg truncate">
                {currentTranscript || (appState === AppState.LISTENING ? "Listening..." : "Ready")}
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
                        Names processed by Gemini. Please review.
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
                            isProcessing={appState === AppState.PROCESSING}
                            onClick={toggleListening} 
                        />
                    </div>
                    
                    {/* Spacer for the big button which sits half-out */}
                    <div className="h-12"></div>

                    {attendees.length > 0 && (
                        <button 
                            onClick={handleFinish}
                            disabled={appState === AppState.LISTENING || appState === AppState.PROCESSING}
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