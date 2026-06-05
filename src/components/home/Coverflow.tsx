import React, { useState, useEffect } from "react";
import "./coverflow.css";

interface CoverflowItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  onClick?: () => void;
  onPlay?: (e: React.MouseEvent) => void;
}

interface CoverflowProps {
  title: string;
  items: CoverflowItem[];
  type: "artists" | "playlists";
}

export function Coverflow({ title, items, type }: CoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);

  // Set initial active index to center of the items
  useEffect(() => {
    if (items.length > 0) {
      setActiveIndex(Math.floor(items.length / 2));
    }
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handleCardClick = (idx: number, item: CoverflowItem) => {
    if (idx === activeIndex) {
      if (item.onClick) item.onClick();
    } else {
      setActiveIndex(idx);
    }
  };

  // Mouse Drag Events
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    const delta = e.clientX - dragStart;
    
    // Threshold of 50px to shift slides
    if (delta > 50) {
      handlePrev();
      setDragStart(null);
    } else if (delta < -50) {
      handleNext();
      setDragStart(null);
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setDragStart(null);
  };

  // Touch Swipe Events
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const delta = e.touches[0].clientX - dragStart;
    
    if (delta > 50) {
      handlePrev();
      setDragStart(null);
    } else if (delta < -50) {
      handleNext();
      setDragStart(null);
    }
  };

  const handleTouchEnd = () => {
    setDragStart(null);
  };

  const getCardStyle = (index: number) => {
    const N = items.length;
    let offset = index - activeIndex;

    // Mathematical circular offset wrapping (forces display in [-N/2, N/2] relative to activeIndex)
    const halfN = Math.floor(N / 2);
    if (offset > halfN) {
      offset -= N;
    } else if (offset < -halfN) {
      offset += N;
    }

    const absOffset = Math.abs(offset);

    let transform = "";
    let zIndex = 10 - absOffset;
    let opacity = 1;
    let pointerEvents: "auto" | "none" = "auto";
    let filter = "none";

    if (offset === 0) {
      // Center card
      transform = "translate3d(0, 0, 0) rotateY(0deg) scale(1)";
    } else if (offset > 0) {
      // Right side cards (closely overlapping)
      const tx = 110 + (absOffset - 1) * 80;
      const tz = -90 - (absOffset - 1) * 70;
      const ry = -28 - (absOffset - 1) * 4;
      const sc = Math.max(0.6, 0.85 - (absOffset - 1) * 0.12);
      transform = `translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${sc})`;
      filter = "brightness(0.55) blur(0.5px)";
      if (absOffset > 2) {
        opacity = 0;
        pointerEvents = "none";
      }
    } else {
      // Left side cards (closely overlapping)
      const tx = -110 - (absOffset - 1) * 80;
      const tz = -90 - (absOffset - 1) * 70;
      const ry = 28 + (absOffset - 1) * 4;
      const sc = Math.max(0.6, 0.85 - (absOffset - 1) * 0.12);
      transform = `translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${sc})`;
      filter = "brightness(0.55) blur(0.5px)";
      if (absOffset > 2) {
        opacity = 0;
        pointerEvents = "none";
      }
    }

    return { transform, zIndex, opacity, pointerEvents, filter };
  };

  return (
    <div className="coverflow-section">
      <h2 className="coverflow-section-title">{title}</h2>
      
      <div 
        className="coverflow-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: dragStart !== null ? "grabbing" : "grab" }}
      >
        {/* 3D Track */}
        <div className="coverflow-track">
          {items.map((item, idx) => {
            const { transform, zIndex, opacity, pointerEvents, filter } = getCardStyle(idx);
            const isCenter = idx === activeIndex;

            return (
              <div
                key={item.id}
                className={`coverflow-card coverflow-card-${type} ${isCenter ? "coverflow-card-center" : ""}`}
                style={{
                  transform,
                  zIndex,
                  opacity,
                  pointerEvents,
                  filter,
                }}
                onClick={() => handleCardClick(idx, item)}
              >
                {/* Image and Play overlay */}
                <div className="coverflow-image-wrapper">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="coverflow-image" 
                    draggable={false}
                  />
                  
                  {/* Play Button reveal on center card hover */}
                  {item.onPlay && (
                    <div className="coverflow-play-overlay">
                      <button
                        className="coverflow-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.onPlay) item.onPlay(e);
                        }}
                        title="Play"
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="coverflow-meta">
                  <p className="coverflow-title" title={item.title}>
                    {item.title}
                  </p>
                  <p className="coverflow-subtitle" title={item.subtitle}>
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
