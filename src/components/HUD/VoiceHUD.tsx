import React, { useState } from "react";
import { Room, RoomId, PrimaryState } from "../../state/types";

interface VoiceHUDProps {
  rooms: Room[];
  activeRoomId: RoomId;
  fsmState: PrimaryState;
  transcript: string;
  onSelectRoom: (id: RoomId) => void;
  onToggleMic: () => void;
  onSubmitCommand: (commandText: string) => void;
}

const SUGGESTIONS = [
  "Anniversary with balcony under ₦150k",
  "Show me the balcony at night",
  "Show me the bathroom",
  "Deluxe under ₦100k"
];

export const VoiceHUD: React.FC<VoiceHUDProps> = ({
  rooms,
  activeRoomId,
  fsmState,
  transcript,
  onSelectRoom,
  onToggleMic,
  onSubmitCommand
}) => {
  const [inputText, setInputText] = useState("");
  const isListening = fsmState === "LISTENING";
  const isUnderstanding = fsmState === "UNDERSTANDING";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;
    onSubmitCommand(query);
    setInputText("");
  };

  const handleChipClick = (suggestion: string) => {
    onSubmitCommand(suggestion);
  };

  return (
    <div className="voice-hud-container">
      {/* Transcript Subtitle Ribbon */}
      {transcript && (
        <div className="transcript-ribbon" role="status" aria-live="polite">
          <span className="transcript-label">Aurelia</span>
          <p>{transcript}</p>
        </div>
      )}

      {/* Quick Suggestion Chips */}
      <div className="quick-suggestions-row" role="region" aria-label="Quick Commands">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="suggestion-chip-btn"
            onClick={() => handleChipClick(s)}
            title={`Run command: "${s}"`}
          >
            <span>“{s}”</span>
          </button>
        ))}
      </div>

      {/* Text Command Input Bar */}
      <form
        className={`command-bar-form ${isUnderstanding ? "understanding" : ""}`}
        onSubmit={handleSubmit}
        role="search"
        aria-label="Hotel command prompt"
      >
        <div className="command-input-wrapper">
          <span className="command-input-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="command-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a request (e.g. 'Anniversary under ₦150k', 'Show balcony at night')..."
            aria-label="Hotel command input"
          />
          <button
            type="submit"
            className="command-submit-btn"
            disabled={!inputText.trim()}
            aria-label="Send command"
            title="Execute command"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </form>

      {/* Main Interaction Dock (Room Nav + Mic Button) */}
      <div className="interaction-dock">
        {/* Room Navigation Carousel Selectors */}
        <div className="room-nav-pills" role="tablist" aria-label="Room Selection">
          {rooms.map((room) => (
            <button
              key={room.id}
              role="tab"
              aria-selected={room.id === activeRoomId}
              className={`room-nav-btn ${room.id === activeRoomId ? "active" : ""}`}
              onClick={() => onSelectRoom(room.id)}
            >
              {room.name.replace(" Room", "")}
            </button>
          ))}
        </div>

        {/* Microphone Trigger Button */}
        <button
          className={`mic-trigger-btn ${isListening ? "active" : ""}`}
          onClick={onToggleMic}
          aria-label={isListening ? "Deactivate Microphone" : "Activate Microphone to Speak"}
          title={isListening ? "Listening... click to stop" : "Click or hold Spacebar to speak"}
        >
          <div className="mic-pulse-ring" />
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
};

