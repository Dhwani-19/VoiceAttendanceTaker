import React, { useRef, useEffect, useState } from 'react';
import { Attendee } from '../types';
import { Trash2, User, CheckCircle, Pencil, X, Check } from 'lucide-react';

interface AttendeeListProps {
  attendees: Attendee[];
  onRemove: (id: string) => void;
  onEdit: (id: string, newName: string) => void;
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, onRemove, onEdit }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevAttendeesLength = useRef(attendees.length);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Auto-scroll to bottom only when a new attendee is added
  useEffect(() => {
    if (attendees.length > prevAttendeesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevAttendeesLength.current = attendees.length;
  }, [attendees.length]);

  const startEditing = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditValue(attendee.formattedName || attendee.rawInput);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEditing = (id: string) => {
    if (editValue.trim()) {
      onEdit(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEditing(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (attendees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <User size={64} className="mb-4 opacity-20" />
        <p className="text-lg">No names recorded yet.</p>
        <p className="text-sm">Tap the microphone to start attendance.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <div className="grid grid-cols-1 gap-3 p-2">
        {attendees.map((attendee) => (
          <div 
            key={attendee.id} 
            className={`group flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300 ${editingId === attendee.id ? 'ring-2 ring-indigo-500' : ''}`}
          >
            {editingId === attendee.id ? (
              // Edit Mode
              <div className="flex items-center w-full gap-2">
                <div className="bg-indigo-50 p-2 rounded-full hidden sm:block">
                  <Pencil size={20} className="text-indigo-600" />
                </div>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, attendee.id)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-gray-800"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEditing(attendee.id)}
                    className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-2 text-white bg-gray-400 hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="bg-indigo-50 p-2 rounded-full flex-shrink-0">
                    <CheckCircle size={20} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {attendee.formattedName || attendee.rawInput}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {new Date(attendee.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                  <button
                    onClick={() => startEditing(attendee)}
                    className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    aria-label="Edit attendee"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => onRemove(attendee.id)}
                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove attendee"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AttendeeList;