import React from "react";
import { Room, FeatureFocus } from "../../state/types";

interface SpecDockProps {
  room: Room;
  currentFeature: FeatureFocus;
  onSelectFeature: (feature: FeatureFocus) => void;
}

export const SpecDock: React.FC<SpecDockProps> = ({
  room,
  currentFeature,
  onSelectFeature
}) => {
  const formattedPrice = `₦${room.price_per_night.toLocaleString()}`;

  return (
    <aside className="spec-dock" aria-label="Room Specifications">
      <div className="spec-room-badge">
        <span>Suite {room.room_number}</span>
        <span>•</span>
        <span>{room.quiet_tier} Acoustic Quiet</span>
      </div>

      <h1 className="spec-room-title">{room.name}</h1>

      <div className="spec-price-row">
        <span className="spec-price-amount">{formattedPrice}</span>
        <span className="spec-price-period">/ night</span>
      </div>

      <p className="spec-description">{room.description}</p>

      <div className="spec-features-list">
        {room.features.map((feature, idx) => (
          <span
            key={idx}
            className={`spec-feature-tag ${
              (feature.toLowerCase().includes("balcony") && room.has_balcony) ||
              (feature.toLowerCase().includes("tub") && room.has_bathtub)
                ? "highlighted"
                : ""
            }`}
          >
            {feature}
          </span>
        ))}
      </div>

      {/* Feature Inspection Controls */}
      <div className="feature-view-selector" role="group" aria-label="Inspect Room Detail">
        <button
          className={`feature-btn ${currentFeature === "overview" ? "active" : ""}`}
          onClick={() => onSelectFeature("overview")}
        >
          Overview
        </button>
        <button
          className={`feature-btn ${currentFeature === "bathroom" ? "active" : ""}`}
          onClick={() => onSelectFeature("bathroom")}
        >
          {room.has_bathtub ? "Soaking Tub" : "Shower"}
        </button>
        {room.has_balcony && (
          <button
            className={`feature-btn ${currentFeature === "balcony" ? "active" : ""}`}
            onClick={() => onSelectFeature("balcony")}
          >
            Balcony
          </button>
        )}
      </div>
    </aside>
  );
};
