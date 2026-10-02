export const TOTAL_FRAMES = 300;
export const DEFAULT_CAMERA_DURATION_MS = 1000;
export const MIN_FRAME = 1;
export const MAX_FRAME = TOTAL_FRAMES;

/**
 * Authoritative verified landmark frames (1-indexed) in the 300-frame sequence.
 * 
 * - exterior: Frame 1 (0-indexed: 0) — Wide approach runway, Saguaro cacti, brutalist hillside facade
 * - entrance: Frame 90 (0-indexed: 89) — Centered reflection pool channel, cedar canopy, pivot doors
 * - living_room: Frame 170 (0-indexed: 169) — Sunken lounge conversation pit panorama, acoustic wood ceiling
 * - kitchen: Frame 245 (0-indexed: 244) — Calacatta marble waterfall island, pendant lighting, barstools
 * - hallway: Frame 280 (0-indexed: 279) — Central gallery corridor with vertical linear slot lighting
 */
export const VERIFIED_CINEMATIC_LANDMARKS: Record<
  "exterior" | "entrance" | "living_room" | "kitchen" | "hallway",
  number
> = {
  exterior: 1,
  entrance: 90,
  living_room: 170,
  kitchen: 245,
  hallway: 280
};

export type CinematicLandmarkId = keyof typeof VERIFIED_CINEMATIC_LANDMARKS;

/**
 * Secondary verified alternate landmark points for close inspection
 */
export const ALTERNATE_CINEMATIC_LANDMARKS = {
  entrance_canopy: 105, // Frame 105: Under-canopy entry threshold
  kitchen_island: 255   // Frame 255: Forward view of island past sofa
} as const;

export type EasingFunction = (t: number) => number;

/**
 * Standard cubic ease-in-out curve for cinematic camera acceleration and deceleration.
 * Provides a gentle ramp up, smooth cruising travel, and soft landing at target.
 */
export function easeInOutCubic(t: number): number {
  const clampedT = Math.min(1, Math.max(0, t));
  return clampedT < 0.5
    ? 4 * clampedT * clampedT * clampedT
    : 1 - Math.pow(-2 * clampedT + 2, 3) / 2;
}

/**
 * Clamps a 1-indexed frame number to the valid range [min, max].
 * Handles negative numbers, 0, numbers > max, floats, and NaNs safely.
 */
export function clampFrame(
  frame: number,
  min: number = MIN_FRAME,
  max: number = MAX_FRAME
): number {
  if (typeof frame !== "number" || Number.isNaN(frame)) return min;
  const rounded = Math.round(frame);
  return Math.min(max, Math.max(min, rounded));
}

/**
 * Converts a 1-indexed frame number (1..300) to a 0-indexed frame index (0..299).
 */
export function frameToIndex(frame: number, totalFrames: number = TOTAL_FRAMES): number {
  const clamped = clampFrame(frame, 1, totalFrames);
  return clamped - 1;
}

/**
 * Converts a 0-indexed frame index (0..299) to a 1-indexed frame number (1..300).
 */
export function indexToFrame(index: number, totalFrames: number = TOTAL_FRAMES): number {
  if (typeof index !== "number" || Number.isNaN(index)) return 1;
  const rounded = Math.round(index);
  return clampFrame(rounded + 1, 1, totalFrames);
}

/**
 * Converts a 1-indexed frame (1..300) to normalized scroll progress [0..1].
 */
export function frameToProgress(frame: number, totalFrames: number = TOTAL_FRAMES): number {
  if (totalFrames <= 1) return 0;
  const clamped = clampFrame(frame, 1, totalFrames);
  return (clamped - 1) / (totalFrames - 1);
}

/**
 * Converts normalized scroll progress [0..1] to a 1-indexed frame (1..300).
 */
export function progressToFrame(progress: number, totalFrames: number = TOTAL_FRAMES): number {
  if (totalFrames <= 1) return 1;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const index = Math.floor(clampedProgress * (totalFrames - 1));
  return clampFrame(index + 1, 1, totalFrames);
}

/**
 * Computes instantaneous interpolated frame between startFrame and targetFrame.
 */
export function calculateTimelineFrame(
  startFrame: number,
  targetFrame: number,
  progress: number,
  easing: EasingFunction = easeInOutCubic
): number {
  const clampedStart = clampFrame(startFrame);
  const clampedTarget = clampFrame(targetFrame);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const easedProgress = easing(clampedProgress);
  const rawFrame = clampedStart + (clampedTarget - clampedStart) * easedProgress;
  return clampFrame(rawFrame);
}

/**
 * Computes normalized progress [0..1] given start time, current time, and duration.
 */
export function calculateTimelineProgress(
  startTime: number,
  currentTime: number,
  durationMs: number
): number {
  if (durationMs <= 0) return 1;
  const elapsed = Math.max(0, currentTime - startTime);
  return Math.min(1, elapsed / durationMs);
}

/**
 * Detects whether the user agent prefers reduced motion.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface CameraTarget {
  frame: number;
  durationMs: number;
}

export interface CameraTimelineOptions {
  durationMs?: number;
  easing?: EasingFunction;
  onUpdate?: (frame: number, progress: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  /** Force animation even if reduced motion is requested (e.g. for testing) */
  ignoreReducedMotion?: boolean;
}

/**
 * Resolves a spatial spaceId to its verified landmark CameraTarget.
 */
export function resolveCinematicTarget(
  spaceId: string,
  options?: { durationMs?: number }
): CameraTarget | null {
  const landmarkFrame = VERIFIED_CINEMATIC_LANDMARKS[spaceId as CinematicLandmarkId];
  if (landmarkFrame === undefined) return null;

  return {
    frame: landmarkFrame,
    durationMs: options?.durationMs ?? DEFAULT_CAMERA_DURATION_MS
  };
}

export interface CameraControllerDelegate {
  getCurrentFrame: () => number;
  renderFrame: (frame: number) => void;
  syncScroll?: (frame: number) => void;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

const scheduleRaf = (cb: (time: number) => void): number => {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(() => cb(Date.now()), 16) as unknown as number;
};

const cancelRaf = (id: number): void => {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id as unknown as NodeJS.Timeout);
  }
};

/**
 * Stateful programmatic camera timeline controller.
 * Operates on frame numbers (1..300) and syncs directly with the canvas engine
 * and page scroll runway.
 */
export class CameraTimelineController {
  private delegate: CameraControllerDelegate;
  private currentRafId: number | null = null;
  private isNavigatingFlag: boolean = false;
  private cleanupInterruptionListeners: (() => void) | null = null;

  constructor(delegate: CameraControllerDelegate) {
    this.delegate = delegate;
  }

  public isNavigating(): boolean {
    return this.isNavigatingFlag;
  }

  /**
   * Smoothly navigates the camera to a target frame using requestAnimationFrame.
   * Cancels any active tween if called repeatedly.
   * Respects prefers-reduced-motion by immediately jumping unless ignored.
   */
  public navigateToFrame(
    targetFrameInput: number,
    options: CameraTimelineOptions = {}
  ): Promise<boolean> {
    const targetFrame = clampFrame(targetFrameInput);
    const startFrame = clampFrame(this.delegate.getCurrentFrame());

    // Clean up any currently running animation
    this.cancelNavigation();

    // If already at target, complete immediately
    if (startFrame === targetFrame) {
      this.delegate.renderFrame(targetFrame);
      this.delegate.syncScroll?.(targetFrame);
      options.onUpdate?.(targetFrame, 1);
      options.onComplete?.();
      return Promise.resolve(true);
    }

    // Check reduced motion preference
    const prefersReduced = isReducedMotionPreferred() && !options.ignoreReducedMotion;
    const duration = prefersReduced ? 0 : (options.durationMs ?? DEFAULT_CAMERA_DURATION_MS);
    const easing = options.easing ?? easeInOutCubic;

    if (duration <= 0) {
      this.delegate.renderFrame(targetFrame);
      this.delegate.syncScroll?.(targetFrame);
      options.onUpdate?.(targetFrame, 1);
      options.onComplete?.();
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      this.isNavigatingFlag = true;
      this.delegate.onAnimationStart?.();

      const startTime = performance.now();

      // Interruption detector: cancel tween immediately if user scrolls/touches
      const handleUserInterruption = () => {
        this.cancelNavigation();
        options.onCancel?.();
        resolve(false);
      };

      if (typeof window !== "undefined") {
        const events = ["wheel", "touchmove", "pointerdown"];
        const keyHandler = (e: KeyboardEvent) => {
          const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", "Home", "End"];
          if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
            handleUserInterruption();
          }
        };

        events.forEach((evt) =>
          window.addEventListener(evt, handleUserInterruption, { passive: true })
        );
        window.addEventListener("keydown", keyHandler, { passive: true });

        this.cleanupInterruptionListeners = () => {
          events.forEach((evt) =>
            window.removeEventListener(evt, handleUserInterruption)
          );
          window.removeEventListener("keydown", keyHandler);
        };
      }

      const step = (currentTime: number) => {
        const progress = calculateTimelineProgress(startTime, currentTime, duration);
        const currentFrame = calculateTimelineFrame(startFrame, targetFrame, progress, easing);

        this.delegate.renderFrame(currentFrame);
        this.delegate.syncScroll?.(currentFrame);
        options.onUpdate?.(currentFrame, progress);

        if (progress >= 1) {
          this.cleanup();
          this.delegate.renderFrame(targetFrame);
          this.delegate.syncScroll?.(targetFrame);
          options.onComplete?.();
          resolve(true);
        } else {
          this.currentRafId = scheduleRaf(step);
        }
      };

      this.currentRafId = scheduleRaf(step);
    });
  }

  /**
   * Immediately halts any active programmatic camera animation.
   */
  public cancelNavigation(): void {
    if (this.currentRafId !== null) {
      cancelRaf(this.currentRafId);
      this.currentRafId = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.cleanupInterruptionListeners) {
      this.cleanupInterruptionListeners();
      this.cleanupInterruptionListeners = null;
    }
    if (this.isNavigatingFlag) {
      this.isNavigatingFlag = false;
      this.delegate.onAnimationEnd?.();
    }
  }
}
