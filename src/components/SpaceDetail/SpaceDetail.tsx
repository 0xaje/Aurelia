import React, { useState, useMemo } from "react";
import {
  defaultProperty,
  getDetailSpaces,
  PropertySpace,
  SpaceId
} from "../../domain/spatial";
import "../../styles/spaceDetail.css";

interface SpaceDetailProps {
  initialSpaceId?: SpaceId;
  onSpaceChange?: (spaceId: SpaceId) => void;
}

export const SpaceDetail: React.FC<SpaceDetailProps> = ({
  initialSpaceId = "master_bedroom",
  onSpaceChange
}) => {
  const detailSpaces = useMemo(() => getDetailSpaces(defaultProperty), []);
  const [selectedSpaceId, setSelectedSpaceId] = useState<SpaceId>(initialSpaceId);

  // Sync state if initialSpaceId prop changes externally
  React.useEffect(() => {
    if (initialSpaceId) {
      setSelectedSpaceId(initialSpaceId);
    }
  }, [initialSpaceId]);

  const activeSpace: PropertySpace = useMemo(() => {
    return detailSpaces.find((s) => s.id === selectedSpaceId) || detailSpaces[0];
  }, [detailSpaces, selectedSpaceId]);

  const handleSelectSpace = (id: SpaceId) => {
    setSelectedSpaceId(id);
    onSpaceChange?.(id);
  };

  return (
    <section
      id="sanctuary-details"
      className="space-detail-section"
      aria-label="Aurelia Sanctuary Spaces Explorer"
    >
      <div className="space-detail-container">
        {/* Header & Manifesto Narrative */}
        <header className="space-detail-header">
          <span className="space-detail-kicker">ARCHITECTURAL MANIFESTO • SANCTUARY SPACES</span>
          <h2 className="space-detail-title">Sculpted Into The Mountain</h2>
          <p className="space-detail-lead">
            Aurelia Sanctuary merges brutalist desert geometry with native flora. Beyond the central arrival lounge,
            three secluded sanctuaries extend the living experience directly into the canyon contours.
          </p>
        </header>

        {/* Spatial Selector Navigation Strip */}
        <nav className="space-nav-strip" aria-label="Sanctuary Space Navigation" role="tablist">
          {detailSpaces.map((space) => {
            const isActive = space.id === selectedSpaceId;
            return (
              <button
                key={space.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${space.id}`}
                className={`space-nav-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSelectSpace(space.id)}
              >
                <span className="nav-indicator-dot" aria-hidden="true" />
                <span>{space.name.replace(" Suite", "").replace(" & Terrace", "")}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Featured Space Display */}
        <article
          id={`panel-${activeSpace.id}`}
          className="featured-space-display"
          role="tabpanel"
          aria-labelledby={`tab-${activeSpace.id}`}
        >
          {/* High-Resolution Spatial Visual */}
          <div className="featured-image-wrapper">
            {activeSpace.visual && (
              <img
                src={activeSpace.visual.src}
                alt={activeSpace.visual.alt}
                className="featured-space-image"
                loading="eager"
              />
            )}
            <div className="image-cinematic-scrim" aria-hidden="true" />
            <span className="image-spatial-badge">
              {activeSpace.category.toUpperCase()} • SANCTUARY
            </span>
          </div>

          {/* Spatial Architectural Placard */}
          <div className="featured-space-details">
            <span className="space-meta-badge">
              <span>AURELIA SANCTUARY</span>
              <span>•</span>
              <span>{activeSpace.category.toUpperCase()}</span>
            </span>

            <h3 className="space-display-name">{activeSpace.name}</h3>

            <p className="space-display-desc">{activeSpace.description}</p>

            <div className="space-features-block">
              <span className="features-kicker">Architectural Signatures</span>
              <div className="features-pill-grid" role="list">
                {activeSpace.architecturalFeatures.map((feat, idx) => (
                  <span key={idx} className="feature-pill" role="listitem">
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Spatial Discovery Strip */}
        <div className="space-thumbnail-strip" role="region" aria-label="Browse All Sanctuaries">
          {detailSpaces.map((space) => {
            const isCurrent = space.id === selectedSpaceId;
            return (
              <button
                key={space.id}
                type="button"
                className={`space-thumb-card ${isCurrent ? "active" : ""}`}
                onClick={() => handleSelectSpace(space.id)}
                aria-label={`View ${space.name}`}
              >
                <div className="thumb-image-frame">
                  {space.visual && (
                    <img src={space.visual.src} alt={space.visual.alt} loading="lazy" />
                  )}
                </div>
                <div className="thumb-info">
                  <span className="thumb-kicker">{space.category}</span>
                  <h4 className="thumb-name">{space.name}</h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
