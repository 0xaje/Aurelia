import React from "react";
import { Room, RoomId, AmbianceMode, FeatureFocus, PrimaryState } from "../../state/types";

interface CinematicStageProps {
  rooms: Room[];
  activeRoomId: RoomId;
  ambianceMode: AmbianceMode;
  featureFocus: FeatureFocus;
  fsmState: PrimaryState;
  onToggleAmbiance: (mode: AmbianceMode) => void;
}

export const CinematicStage: React.FC<CinematicStageProps> = ({
  rooms,
  activeRoomId,
  ambianceMode,
  featureFocus,
  fsmState,
  onToggleAmbiance
}) => {
  const activeIndex = rooms.findIndex((r) => r.id === activeRoomId);
  const trackOffset = activeIndex >= 0 ? -(activeIndex * 100) : 0;

  return (
    <div className={`cinematic-stage ${ambianceMode === "night" ? "is-night" : "is-day"}`}>
      {/* Brand Header */}
      <header className="brand-header">
        <div className="hotel-title">
          <span className="hotel-name">AURELIA</span>
          <span className="hotel-tagline">Conversational Hotel</span>
        </div>

        <div className="header-meta">
          {/* Day / Night Toggle */}
          <div
            className="ambiance-pill-toggle"
            role="group"
            aria-label="Ambiance Lighting Mode"
          >
            <button
              className={`toggle-option ${ambianceMode === "day" ? "active" : ""}`}
              onClick={() => onToggleAmbiance("day")}
              aria-pressed={ambianceMode === "day"}
            >
              Day
            </button>
            <button
              className={`toggle-option ${ambianceMode === "night" ? "active" : ""}`}
              onClick={() => onToggleAmbiance("night")}
              aria-pressed={ambianceMode === "night"}
            >
              Night
            </button>
          </div>

          {/* Active FSM State Badge */}
          <div className="state-badge">
            <span
              className={`state-indicator-dot ${
                fsmState === "LISTENING" || fsmState === "VISUAL_TRANSITION" ? "pulse" : ""
              }`}
            />
            <span>{fsmState}</span>
          </div>
        </div>
      </header>

      {/* Sliding Room Track */}
      <div
        className="stage-track"
        style={{ transform: `translateX(${trackOffset}vw)` }}
        aria-live="polite"
      >
        {rooms.map((room) => {
          // Determine which image to show based on featureFocus
          let dayImg = room.media.day_overview;
          let nightImg = room.media.night_overview;

          if (featureFocus === "bathroom") {
            dayImg = room.media.bathroom_detail;
            nightImg = room.media.bathroom_detail;
          } else if (featureFocus === "balcony" && room.media.balcony_detail) {
            dayImg = room.media.balcony_detail;
            nightImg = room.media.balcony_detail;
          }

          const isZoomed = featureFocus !== "overview";

          return (
            <div key={room.id} className="room-slide" data-room-id={room.id}>
              <div className={`slide-visual ${isZoomed ? "feature-zoom" : ""}`}>
                {/* Day Layer */}
                <div
                  className="media-layer day-layer"
                  style={{ backgroundImage: `url(${dayImg})` }}
                  role="img"
                  aria-label={`${room.name} — Day Ambiance`}
                />
                {/* Night Layer */}
                <div
                  className="media-layer night-layer"
                  style={{ backgroundImage: `url(${nightImg})` }}
                  role="img"
                  aria-label={`${room.name} — Night Ambiance`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Atmospheric Scrim Overlay */}
      <div className="stage-scrim" />
    </div>
  );
};
