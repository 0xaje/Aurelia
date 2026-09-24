import React, { useState, useEffect, useMemo, useCallback } from "react";
import rawRooms from "../data/rooms.json";
import { Room, RoomId, AmbianceMode, FeatureFocus, PrimaryState, AppNotification } from "./state/types";
import { AureliaFSM } from "./state/stateMachine";
import { CinematicStage } from "./components/Stage/CinematicStage";
import { SpecDock } from "./components/SpecDock/SpecDock";
import { VoiceHUD } from "./components/HUD/VoiceHUD";
import { interpretTextCommand, formatCommandResponse } from "./domain/interpreter";
import { searchRooms } from "./domain/roomSearch";
import "./styles/tokens.css";
import "./styles/stage.css";
import "./styles/hud.css";

const roomsData: Room[] = rawRooms as Room[];

export const App: React.FC = () => {
  const fsm = useMemo(() => new AureliaFSM("EXPLORING"), []);
  const [fsmState, setFsmState] = useState<PrimaryState>(fsm.getState());

  const [activeRoomId, setActiveRoomId] = useState<RoomId>("executive-suite");
  const [ambianceMode, setAmbianceMode] = useState<AmbianceMode>("day");
  const [featureFocus, setFeatureFocus] = useState<FeatureFocus>("overview");
  const [transcript, setTranscript] = useState<string>(
    "Welcome to Aurelia Hotel. Speak to explore suites, preview night views, or reserve."
  );
  const [notification, setNotification] = useState<AppNotification | null>(null);

  // Subscribe to FSM state updates
  useEffect(() => {
    const unsubscribe = fsm.subscribe((state) => {
      setFsmState(state);
    });
    return unsubscribe;
  }, [fsm]);

  // Current active room object
  const activeRoom = useMemo(() => {
    return roomsData.find((r) => r.id === activeRoomId) || roomsData[0];
  }, [activeRoomId]);

  // Action: Select Room with Visual Transition
  const handleSelectRoom = useCallback(
    (newRoomId: RoomId) => {
      if (newRoomId === activeRoomId) return;

      fsm.transition("VISUAL_TRANSITION");
      setActiveRoomId(newRoomId);
      setFeatureFocus("overview"); // Reset to overview on room change

      const target = roomsData.find((r) => r.id === newRoomId);
      setTranscript(`Presenting ${target?.name || "Suite"}.`);

      // Complete visual transition after 500ms
      setTimeout(() => {
        fsm.transition("EXPLORING");
      }, 500);
    },
    [activeRoomId, fsm]
  );

  // Action: Toggle Day / Night Ambiance
  const handleToggleAmbiance = useCallback(
    (mode: AmbianceMode) => {
      setAmbianceMode(mode);
      setTranscript(
        mode === "night"
          ? "Atmosphere transitioned to evening architectural lighting."
          : "Atmosphere transitioned to natural daylight."
      );
    },
    []
  );

  // Action: Select Feature Focus
  const handleSelectFeature = useCallback(
    (feature: FeatureFocus) => {
      setFeatureFocus(feature);
      const featureLabel =
        feature === "bathroom"
          ? activeRoom.has_bathtub
            ? "soaking tub"
            : "rainfall shower"
          : feature;
      setTranscript(`Inspecting ${featureLabel} in ${activeRoom.name}.`);
    },
    [activeRoom]
  );

  // Action: Toggle Microphone (Visual Demonstration for Slice 1)
  const handleToggleMic = useCallback(() => {
    if (fsmState === "LISTENING") {
      fsm.transition("EXPLORING");
      setTranscript("Microphone closed. Room exploration active.");
    } else {
      fsm.transition("LISTENING");
      setTranscript("Listening... Speak your preference or budget.");
    }
  }, [fsm, fsmState]);

  // Action: Handle Text Command Submission (Slice 2 Core Loop)
  const handleTextCommandSubmit = useCallback(
    (commandText: string) => {
      // 1. Transition FSM to UNDERSTANDING
      fsm.transition("UNDERSTANDING");

      // 2. Interpret command deterministically
      const cmd = interpretTextCommand(commandText);

      if (cmd.type === "SEARCH_ROOMS") {
        const matched = searchRooms(roomsData, cmd.filters);
        if (matched.length > 0) {
          const topMatch = matched[0];
          const responseText = formatCommandResponse(cmd, matched, topMatch);

          // Transition to VISUAL_TRANSITION
          fsm.transition("VISUAL_TRANSITION");
          setActiveRoomId(topMatch.id);
          setFeatureFocus("overview");
          setTranscript(responseText);

          // Complete transition to EXPLORING
          setTimeout(() => {
            fsm.transition("EXPLORING");
          }, 500);
        } else {
          const fallbackMsg = formatCommandResponse(cmd, []);
          fsm.transition("RESPONDING");
          setTranscript(fallbackMsg);
          setNotification({
            id: Math.random().toString(36).substring(2, 9),
            level: "info",
            message: "No suite matches all requested criteria. Showing current selection.",
            timestamp: Date.now()
          });
          setTimeout(() => {
            fsm.transition("EXPLORING");
          }, 600);
        }
      } else if (cmd.type === "ADJUST_VIEW") {
        fsm.transition("VISUAL_TRANSITION");
        if (cmd.ambiance) {
          setAmbianceMode(cmd.ambiance);
        }
        if (cmd.feature) {
          setFeatureFocus(cmd.feature);
        }
        const responseText = formatCommandResponse(cmd, undefined, activeRoom);
        setTranscript(responseText);

        setTimeout(() => {
          fsm.transition("EXPLORING");
        }, 500);
      } else {
        // UNSUPPORTED
        fsm.transition("RESPONDING");
        setTranscript(cmd.reason);
        setNotification({
          id: Math.random().toString(36).substring(2, 9),
          level: "info",
          message: cmd.reason,
          timestamp: Date.now()
        });
        setTimeout(() => {
          fsm.transition("EXPLORING");
        }, 600);
      }
    },
    [fsm, activeRoom]
  );

  // Keyboard navigation support (Arrow keys, D/N, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const currIdx = roomsData.findIndex((r) => r.id === activeRoomId);
        const nextIdx = (currIdx + 1) % roomsData.length;
        handleSelectRoom(roomsData[nextIdx].id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const currIdx = roomsData.findIndex((r) => r.id === activeRoomId);
        const prevIdx = (currIdx - 1 + roomsData.length) % roomsData.length;
        handleSelectRoom(roomsData[prevIdx].id);
      } else if (e.key.toLowerCase() === "d") {
        handleToggleAmbiance("day");
      } else if (e.key.toLowerCase() === "n") {
        handleToggleAmbiance("night");
      } else if (e.code === "Space") {
        e.preventDefault();
        handleToggleMic();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRoomId, handleSelectRoom, handleToggleAmbiance, handleToggleMic]);

  // Auto-clear notifications after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <main role="main" style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Toast Notification Overlay */}
      {notification && (
        <div className="toast-overlay" role="alert">
          <span>{notification.level === "error" ? "⚠️" : "✨"}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Full-bleed Cinematic Stage */}
      <CinematicStage
        rooms={roomsData}
        activeRoomId={activeRoomId}
        ambianceMode={ambianceMode}
        featureFocus={featureFocus}
        fsmState={fsmState}
        onToggleAmbiance={handleToggleAmbiance}
      />

      {/* Authoritative Spec Dock */}
      <SpecDock
        room={activeRoom}
        currentFeature={featureFocus}
        onSelectFeature={handleSelectFeature}
      />

      {/* Voice HUD & Interaction Bar */}
      <VoiceHUD
        rooms={roomsData}
        activeRoomId={activeRoomId}
        fsmState={fsmState}
        transcript={transcript}
        onSelectRoom={handleSelectRoom}
        onToggleMic={handleToggleMic}
        onSubmitCommand={handleTextCommandSubmit}
      />
    </main>
  );
};
