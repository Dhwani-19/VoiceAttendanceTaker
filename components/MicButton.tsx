import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  isProcessing?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const MicButton: React.FC<MicButtonProps> = ({ isListening, isProcessing, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`
        relative flex items-center justify-center w-32 h-32 rounded-full shadow-xl transition-all duration-300
        ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''}
        ${!disabled && isListening ? 'bg-red-500 hover:bg-red-600 scale-110' : ''}
        ${!disabled && !isListening ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
      `}
    >
      {/* Pulse animation when listening */}
      {isListening && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
      )}

      <div className="z-10 text-white">
        {isProcessing ? (
           <Loader2 size={48} className="animate-spin" />
        ) : isListening ? (
          <MicOff size={48} />
        ) : (
          <Mic size={48} />
        )}
      </div>
      
      <span className="absolute -bottom-10 text-gray-600 font-medium text-sm w-48 text-center">
        {isListening ? 'Tap to Stop' : 'Tap to Record Name'}
      </span>
    </button>
  );
};

export default MicButton;