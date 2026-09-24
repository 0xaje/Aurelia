import React from "react";
import { Room, RoomId, PrimaryState } from "../../state/types";

interface VoiceHUDProps {
  rooms: Room[];
  activeRoomId: RoomId;
  fsmState: PrimaryState;
  transcript: string;
  onSelectRoom: (id: RoomId) => void;
  onToggleMic: () => void;
}

export const VoiceHUD: React.FC<VoiceHUDProps> = ({
  rooms,
  activeRoomId,
  fsmState,
  transcript,
  onSelectRoom,
  onToggleMic
}) => {
  const isListening = fsmState === "LISTENING";

  return (
    <div className="voice-hud-container">
      {/* Transcript Subtitle Ribbon */}
      {transcript && (
        <div className="transcript-ribbon" role="status" aria-live="polite">
          <span className="transcript-label">Aurelia</span>
          <p>{transcript}</p>
        </div>
      )}

      {/* Main Interaction Dock */}
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
