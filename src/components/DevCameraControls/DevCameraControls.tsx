import React, { useState, useEffect } from "react";
import { SpaceId } from "../../domain/spatial";
import {
  VERIFIED_CINEMATIC_LANDMARKS,
  CinematicLandmarkId
} from "../../camera/cameraTimeline";
import "../../styles/devCameraControls.css";

interface DevCameraControlsProps {
  onShowSpace: (spaceId: SpaceId) => void;
  onCancelNavigation: () => void;
  getCurrentFrame: () => number;
  isNavigating: () => boolean;
}

declare global {
  interface Window {
    aureliaCamera?: {
      showSpace: (spaceId: SpaceId) => void;
      navigateToFrame: (frame: number, durationMs?: number) => void;
      cancelNavigation: () => void;
      getCurrentFrame: () => number;
      isNavigating: () => boolean;
      landmarks: typeof VERIFIED_CINEMATIC_LANDMARKS;
    };
  }
}

export const DevCameraControls: React.FC<DevCameraControlsProps> = ({
  onShowSpace,
  onCancelNavigation,
  getCurrentFrame,
  isNavigating
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeFrame, setActiveFrame] = useState<number>(1);
  const [animating, setAnimating] = useState<boolean>(false);

  // Poll current frame and navigation status for HUD display
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFrame(getCurrentFrame());
      setAnimating(isNavigating());
    }, 50);

    return () => clearInterval(interval);
  }, [getCurrentFrame, isNavigating]);

  // Expose global developer API on window for console and test automation
  useEffect(() => {
    window.aureliaCamera = {
      showSpace: (spaceId: SpaceId) => onShowSpace(spaceId),
      navigateToFrame: (frame: number, durationMs?: number) => {
        // Direct frame navigation through window API
        const event = new CustomEvent("aurelia:navigate-frame", {
          detail: { frame, durationMs }
        });
        window.dispatchEvent(event);
      },
      cancelNavigation: () => onCancelNavigation(),
      getCurrentFrame: () => getCurrentFrame(),
      isNavigating: () => isNavigating(),
      landmarks: VERIFIED_CINEMATIC_LANDMARKS
    };

    return () => {
      delete window.aureliaCamera;
    };
  }, [onShowSpace, onCancelNavigation, getCurrentFrame, isNavigating]);

  const cinematicLandmarks: { id: CinematicLandmarkId; label: string; frame: number }[] = [
    { id: "exterior", label: "Exterior", frame: VERIFIED_CINEMATIC_LANDMARKS.exterior },
    { id: "entrance", label: "Entrance", frame: VERIFIED_CINEMATIC_LANDMARKS.entrance },
    { id: "living_room", label: "Living Room", frame: VERIFIED_CINEMATIC_LANDMARKS.living_room },
    { id: "kitchen", label: "Kitchen", frame: VERIFIED_CINEMATIC_LANDMARKS.kitchen },
    { id: "hallway", label: "Hallway", frame: VERIFIED_CINEMATIC_LANDMARKS.hallway }
  ];

  const detailSpaces: { id: SpaceId; label: string }[] = [
    { id: "master_bedroom", label: "Master Suite" },
    { id: "ensuite_bathroom", label: "Ensuite Spa" },
    { id: "infinity_pool", label: "Infinity Pool" }
  ];

  return (
    <aside className="dev-camera-hud" aria-label="Aurelia Developer Camera Controller">
      <button
        type="button"
        className="dev-hud-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className={`dev-hud-pulse-dot ${animating ? "animating" : ""}`} />
        <span>CAMERA HUD • F{activeFrame}</span>
      </button>

      {isOpen && (
        <div className="dev-hud-panel" role="region" aria-label="Camera Landmarks">
          <div className="dev-hud-header">
            <span className="dev-hud-title">Camera Controller</span>
            <span className={`dev-hud-badge ${animating ? "active" : ""}`}>
              {animating ? "TWEENING" : "IDLE"}
            </span>
          </div>

          <div className="dev-hud-section-label">Cinematic Landmarks (Canvas)</div>
          <div className="dev-hud-button-grid">
            {cinematicLandmarks.map((lm) => (
              <button
                key={lm.id}
                type="button"
                className="dev-hud-btn"
                onClick={() => onShowSpace(lm.id)}
              >
                <span>{lm.label}</span>
                <span className="dev-hud-btn-tag">F{lm.frame}</span>
              </button>
            ))}
          </div>

          <div className="dev-hud-section-label">Detail Sanctuaries (Plates)</div>
          <div className="dev-hud-button-grid full-width">
            {detailSpaces.map((space) => (
              <button
                key={space.id}
                type="button"
                className="dev-hud-btn"
                onClick={() => onShowSpace(space.id)}
              >
                <span>{space.label}</span>
                <span className="dev-hud-btn-tag">PLATE</span>
              </button>
            ))}
          </div>

          {animating && (
            <button
              type="button"
              className="dev-hud-cancel-btn"
              onClick={onCancelNavigation}
            >
              Cancel Transition
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
