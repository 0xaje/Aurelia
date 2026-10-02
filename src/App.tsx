import React, { useCallback, useRef, useState, useEffect } from "react";
import { ScrollHero, ScrollHeroHandle } from "./components/ScrollHero/ScrollHero";
import { SpaceDetail } from "./components/SpaceDetail/SpaceDetail";
import { DevCameraControls } from "./components/DevCameraControls/DevCameraControls";
import { OraPresence } from "./components/OraPresence/OraPresence";
import { SpaceId, SpatialAction, resolveSpaceAction, defaultProperty } from "./domain/spatial";
import { aureliaAtmosphere, AureliaAtmosphere } from "./audio/AureliaAtmosphere";
import { OraAtmosphereCoordinator } from "./audio/OraAtmosphereCoordinator";
import { OraState } from "./ora/oraTypes";
import "./styles/tokens.css";

declare global {
  interface Window {
    aureliaAtmosphere?: AureliaAtmosphere;
    aureliaAtmosphereCoordinator?: OraAtmosphereCoordinator;
  }
}

export const App: React.FC = () => {
  const scrollHeroRef = useRef<ScrollHeroHandle>(null);
  const [activeDetailSpace, setActiveDetailSpace] = useState<SpaceId>("master_bedroom");
  const coordinatorRef = useRef<OraAtmosphereCoordinator | null>(null);

  if (!coordinatorRef.current) {
    coordinatorRef.current = new OraAtmosphereCoordinator(aureliaAtmosphere);
  }

  // Subscribe to Ora interaction states to coordinate atmosphere duck/restore
  const handleOraStateChange = useCallback((state: OraState) => {
    coordinatorRef.current?.handleState(state);
  }, []);

  // Immediately expose developer atmosphere API on window
  if (typeof window !== "undefined") {
    window.aureliaAtmosphere = aureliaAtmosphere;
    if (coordinatorRef.current) {
      window.aureliaAtmosphereCoordinator = coordinatorRef.current;
    }
  }

  // Expose developer atmosphere API on window
  useEffect(() => {
    window.aureliaAtmosphere = aureliaAtmosphere;
    window.aureliaAtmosphereCoordinator = coordinatorRef.current || undefined;
    return () => {
      delete window.aureliaAtmosphere;
      delete window.aureliaAtmosphereCoordinator;
      coordinatorRef.current?.reset();
    };
  }, []);

  // Auto-start atmosphere music and Ora arrival experience on website open
  useEffect(() => {
    const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
      "pointerdown",
      "mousedown",
      "touchstart",
      "scroll",
      "wheel",
      "keydown",
      "click"
    ];

    const startAtmosphereAndOra = async () => {
      // 1. Atmosphere music: start playing or resume
      if (aureliaAtmosphere.getState() !== "playing") {
        try {
          await aureliaAtmosphere.ensurePlaying(1200);
        } catch {
          // Handled if browser autoplay blocked before gesture
        }
      }

      // 2. Ora welcome & continuous microphone
      if (window.aureliaVoice?.triggerWelcome) {
        window.aureliaVoice.triggerWelcome().catch(() => {});
      } else if (window.aureliaOra?.welcome) {
        window.aureliaOra.welcome().catch(() => {});
      }
    };

    // Attempt immediately on mount (works if user previously interacted or browser allows cold autoplay)
    startAtmosphereAndOra();

    // Universal gesture unlock: first touch, click, scroll, wheel, or key anywhere
    // ensures atmosphere music fades in and mic turns on the instant the user interacts
    const handleGestureUnlock = async () => {
      await startAtmosphereAndOra();

      // Only unbind interaction listeners once atmosphere is confirmed playing
      if (aureliaAtmosphere.getState() === "playing") {
        INTERACTION_EVENTS.forEach((evt) => {
          window.removeEventListener(evt, handleGestureUnlock);
        });
      }
    };

    INTERACTION_EVENTS.forEach((evt) => {
      window.addEventListener(evt, handleGestureUnlock, { passive: true });
    });

    return () => {
      INTERACTION_EVENTS.forEach((evt) => {
        window.removeEventListener(evt, handleGestureUnlock);
      });
    };
  }, []);

  const handleBeginJourney = useCallback(async () => {
    // 1. Atmosphere: ensure playing with smooth fade in
    try {
      await aureliaAtmosphere.ensurePlaying(1200);
    } catch {
      // Audio failure must never block or degrade the visual experience
    }

    // 2. Existing Begin Journey navigation remains completely intact
    const el = document.getElementById("sanctuary-details");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Central spatial & environmental action dispatcher
  const handleSpatialAction = useCallback((action: SpatialAction) => {
    // Environmental ambiance action
    if (action.type === "SHOW_AMBIANCE") {
      scrollHeroRef.current?.setAmbiance(action.ambiance);
      return;
    }

    const resolution = resolveSpaceAction(action, defaultProperty);
    if (!resolution.success) return;

    if (resolution.view.mode === "cinematic") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      scrollHeroRef.current?.navigateToFrame(resolution.view.frame);
    } else if (resolution.view.mode === "detail") {
      const targetSpaceId = resolution.view.space.id;
      setActiveDetailSpace(targetSpaceId);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const cardEl =
            document.getElementById(`panel-${targetSpaceId}`) ||
            document.querySelector(".featured-space-display");
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const el = document.getElementById("sanctuary-details");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 60);
      });
    } else if (resolution.view.mode === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      scrollHeroRef.current?.navigateToFrame(1);
    }
  }, []);

  const handleShowSpace = useCallback(
    (spaceId: SpaceId) => {
      handleSpatialAction({ type: "SHOW_SPACE", spaceId });
    },
    [handleSpatialAction]
  );

  const handleCancelNavigation = useCallback(() => {
    scrollHeroRef.current?.cancelNavigation();
  }, []);

  // Listen for direct frame navigation events from dev tools or automation
  useEffect(() => {
    const handleDirectFrameNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ frame: number; durationMs?: number }>;
      if (customEvent.detail && typeof customEvent.detail.frame === "number") {
        scrollHeroRef.current?.navigateToFrame(customEvent.detail.frame, {
          durationMs: customEvent.detail.durationMs
        });
      }
    };

    window.addEventListener("aurelia:navigate-frame", handleDirectFrameNav);
    return () => {
      window.removeEventListener("aurelia:navigate-frame", handleDirectFrameNav);
    };
  }, []);

  return (
    <main role="main" className="aurelia-main-flow" style={{ width: "100%", position: "relative" }}>
      {/* 300-Frame Scroll-Controlled Interactive Architecture Hero (Protected) */}
      <ScrollHero ref={scrollHeroRef} onCtaClick={handleBeginJourney} />

      {/* Spatial Discovery Experience: Architectural Manifesto & Sanctuaries */}
      <SpaceDetail
        initialSpaceId={activeDetailSpace}
        onSpaceChange={setActiveDetailSpace}
      />

      {/* Ora Living Architectural Presence (Minimal Sculptural Object & World Controls) */}
      <OraPresence
        onSpatialAction={handleSpatialAction}
        onStateChange={handleOraStateChange}
      />

      {/* Developer Camera Verification HUD (Only mounted during local development) */}
      {import.meta.env.DEV && (
        <DevCameraControls
          onShowSpace={handleShowSpace}
          onCancelNavigation={handleCancelNavigation}
          getCurrentFrame={() => scrollHeroRef.current?.getCurrentFrame() ?? 1}
          isNavigating={() => scrollHeroRef.current?.isNavigating() ?? false}
        />
      )}
    </main>
  );
};
