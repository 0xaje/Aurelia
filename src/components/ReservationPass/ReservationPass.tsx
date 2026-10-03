import React, { useCallback, useEffect } from "react";
import { ReservationRequest } from "../../domain/reservationTypes";
import { buildWhatsAppHandoffUrl } from "../../domain/reservationHandoff";
import { reservationStore } from "../../domain/reservationStore";
import "./ReservationPass.css";

export interface ReservationPassProps {
  reservation: ReservationRequest;
  onClose: () => void;
  onHandoff?: (reservation: ReservationRequest, url: string) => void;
}

export const ReservationPass: React.FC<ReservationPassProps> = ({
  reservation,
  onClose,
  onHandoff
}) => {
  // Keyboard accessibility: dismiss pass on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  const getStatusLabel = () => {
    switch (reservation.status) {
      case "HANDOFF_OPENED":
        return "HANDOFF OPENED";
      case "READY_FOR_HANDOFF":
        return "READY FOR HANDOFF";
      case "DRAFT":
      default:
        return "DRAFT REQUEST";
    }
  };

  const getStatusClass = () => {
    switch (reservation.status) {
      case "HANDOFF_OPENED":
        return "status-opened";
      case "READY_FOR_HANDOFF":
        return "status-ready";
      case "DRAFT":
      default:
        return "status-draft";
    }
  };

  const handleWhatsAppHandoff = useCallback(() => {
    if (!reservation || !reservation.reference) return;

    try {
      const url = buildWhatsAppHandoffUrl(reservation);

      // Transition state to HANDOFF_OPENED when user activates handoff
      if (reservation.status === "READY_FOR_HANDOFF" || reservation.status === "DRAFT") {
        reservationStore.updateStatus(reservation.reference, "HANDOFF_OPENED");
      }

      onHandoff?.(reservation, url);

      // Open WhatsApp deep link in new browser tab
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Safe fallback if pop-up blocked or window unavailable
    }
  }, [reservation, onHandoff]);

  return (
    <aside
      className="reservation-pass-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-title"
    >
      <div className="reservation-pass-backdrop" onClick={onClose} />

      <div className="reservation-pass-card">
        {/* Close Button */}
        <button
          type="button"
          className="reservation-pass-close"
          onClick={onClose}
          aria-label="Close Reservation Pass"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="6" />
          </svg>
        </button>

        {/* Card Header */}
        <header className="pass-header">
          <div className="pass-brand-mark">
            <span className="pass-brand-name">AURELIA</span>
            <span className="pass-brand-subtitle">SANCTUARY</span>
          </div>
          <div className="pass-document-type">
            <span id="pass-title" className="pass-type-badge">RESERVATION REQUEST</span>
            <span className={`pass-status-pill ${getStatusClass()}`}>
              {getStatusLabel()}
            </span>
          </div>
        </header>

        {/* Card Divider Gold Thread */}
        <div className="pass-thread-line" />

        {/* Pass Body Content */}
        <div className="pass-body">
          {/* Reference & Guest */}
          <div className="pass-grid-row">
            <div className="pass-field">
              <span className="field-label">REQUEST REFERENCE</span>
              <span className="field-value reference-code">{reservation.reference}</span>
            </div>
            <div className="pass-field">
              <span className="field-label">GUEST</span>
              <span className="field-value">{reservation.guestName || "Guest"}</span>
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="pass-grid-row">
            <div className="pass-field">
              <span className="field-label">CHECK-IN</span>
              <span className="field-value">{reservation.checkIn || "Pending dates"}</span>
            </div>
            <div className="pass-field">
              <span className="field-label">CHECK-OUT</span>
              <span className="field-value">{reservation.checkOut || "Pending dates"}</span>
            </div>
          </div>

          {/* Stay Breakdown */}
          <div className="pass-grid-row">
            <div className="pass-field">
              <span className="field-label">DURATION</span>
              <span className="field-value">
                {reservation.nights > 0
                  ? `${reservation.nights} ${reservation.nights === 1 ? "Night" : "Nights"}`
                  : "Dates required"}
              </span>
            </div>
            <div className="pass-field">
              <span className="field-label">SHORTLET NIGHTLY RATE</span>
              <span className="field-value">
                ${reservation.nightlyRate.toLocaleString()} <span className="rate-unit">USD / night</span>
              </span>
            </div>
          </div>

          {/* Pricing Total */}
          <div className="pass-total-box">
            <div className="total-label-wrap">
              <span className="total-title">ESTIMATED STAY TOTAL</span>
              <span className="total-note">
                {reservation.nights > 0
                  ? `${reservation.nights} nights × $${reservation.nightlyRate.toLocaleString()}`
                  : "Calculated upon date selection"}
              </span>
            </div>
            <div className="total-amount">
              ${reservation.total.toLocaleString()} <span className="currency-tag">USD</span>
            </div>
          </div>

          {/* Action CTA: Continue on WhatsApp */}
          <div className="pass-actions">
            <button
              type="button"
              className="pass-whatsapp-btn"
              onClick={handleWhatsAppHandoff}
              aria-label="Continue on WhatsApp to submit reservation request"
            >
              <svg className="whatsapp-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>Continue on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Card Footer with Truthful Clarification */}
        <footer className="pass-footer">
          <p className="pass-truth-disclaimer">
            This is a reservation request, not a confirmed booking. Private buyout stays are finalized upon verified inquiry.
          </p>
        </footer>
      </div>
    </aside>
  );
};
