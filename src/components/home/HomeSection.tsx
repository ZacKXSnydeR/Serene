import { useState, useEffect, useRef } from "react";
import "./homesection.css";
import { getPosterUrl } from "../../utils/imageUtils";

interface HomeSectionProps {
  section: any;
  onItemClick: (item: any) => void;
}

export function HomeSection({ section, onItemClick }: HomeSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState(4);

  const firstItem = section?.contents?.[0];
  const isVideo = firstItem ? !!firstItem.videoId : false;
  
  // Check if thumbnails are 16:9
  let isWide = false;
  if (firstItem && firstItem.thumbnails && firstItem.thumbnails.length > 0) {
    const th = firstItem.thumbnails[0];
    if (th.width > th.height * 1.5) {
      isWide = true;
    }
  }

  // Quick picks or lists usually have many items, we render them as a grid (3 rows)
  // We'll treat any "videoId" collection with square thumbnails as a "Quick Picks" grid.
  const isListGrid = isVideo && !isWide;

  // Calculate visible columns using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // We have 32px padding on left and right, so content width is entry.contentRect.width
        const width = entry.contentRect.width;
        const gap = 24;
        
        let minWidth = 180; // square card
        if (isWide) minWidth = 320; // wide card
        if (isListGrid) minWidth = 350; // list col
        
        // Equation: (minWidth * cols) + (gap * (cols - 1)) <= width
        // cols * (minWidth + gap) - gap <= width
        // cols <= (width + gap) / (minWidth + gap)
        let cols = Math.floor((width + gap) / (minWidth + gap));
        if (cols < 1) cols = 1;
        
        setVisibleColumns(cols);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isWide, isListGrid]);

  if (!section || !section.contents || section.contents.length === 0) return null;
  if (!firstItem) return null;

  // Render List Grid
  if (isListGrid) {
    // We group into columns of 4 rows.
    const itemsPerColumn = 4;
    
    // Only take enough items to fill the visible columns exactly!
    const maxItems = visibleColumns * itemsPerColumn;
    const renderableItems = section.contents.slice(0, maxItems);
    
    const columns = [];
    for (let i = 0; i < renderableItems.length; i += itemsPerColumn) {
      columns.push(renderableItems.slice(i, i + itemsPerColumn));
    }

    return (
      <div className="home-section mb-12" ref={containerRef}>
        <h2 className="home-section-title">{section.title}</h2>
        <div className="home-list-grid-wrapper">
          <div className="home-list-grid" style={{ gridTemplateColumns: `repeat(${visibleColumns}, 1fr)` }}>
            {columns.map((col: any[], colIdx: number) => (
              <div key={colIdx} className="home-list-col">
                {col.map((item: any, idx: number) => {
                  if (!item) return null;
                  return (
                  <div key={idx} className="home-list-item" onClick={() => onItemClick(item)}>
                    <div className="home-list-item-thumb-wrapper">
                      <img 
                        src={getPosterUrl(item)} 
                        alt={item.title || "Unknown"} 
                        className="home-list-item-thumb"
                      />
                      <div className="home-list-item-play-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="home-list-item-info">
                      <div className="home-list-item-title line-clamp-1">{item.title}</div>
                      <div className="home-list-item-desc line-clamp-1">{item.description || item.artists?.map((a:any)=>a.name).join(", ")}</div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Slice contents for square/wide cards to not crop
  const visibleItems = section.contents.slice(0, visibleColumns);

  // Render Carousel (Wide Video or Square Album/Playlist)
  return (
    <div className="home-section mb-12" ref={containerRef}>
      <h2 className="home-section-title">{section.title}</h2>
      <div className="home-carousel-wrapper">
        <div className="home-carousel" style={{ gridTemplateColumns: `repeat(${visibleColumns}, 1fr)` }}>
          {visibleItems.map((item: any, idx: number) => {
             if (!item) return null;
             return (
            <div 
              key={idx} 
              className={`home-carousel-card ${isWide ? 'wide-card' : 'square-card'}`}
              onClick={() => onItemClick(item)}
            >
              <div className="home-carousel-thumb-wrapper">
                <img 
                  src={getPosterUrl(item)} 
                  alt={item.title || "Unknown"} 
                  className="home-carousel-thumb"
                />
                <div className="home-carousel-play-overlay">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="home-carousel-info">
                <div className="home-carousel-title line-clamp-1">{item.title}</div>
                <div className="home-carousel-desc line-clamp-2">{item.description || item.artists?.map((a:any)=>a.name).join(", ")}</div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
