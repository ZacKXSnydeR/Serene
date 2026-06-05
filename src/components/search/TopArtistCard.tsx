import React from 'react';
import './topartistcard.css';

interface TopArtistCardProps {
  artist: {
    id: string;
    title: string;
    subtitle: string;
    image: string;
  };
  onClick: () => void;
}

const TopArtistCard: React.FC<TopArtistCardProps> = ({ artist, onClick }) => {
  return (
    <div className="top-artist-wrapper" onClick={onClick}>
      <div className="top-artist-glass-card group">
        
        {/* Info Side (Moved to Top) */}
        <div className="top-artist-info">
          <h2 className="top-artist-title">{artist.title}</h2>
          <p className="top-artist-stats">{artist.subtitle}</p>
        </div>

        {/* Media Area */}
        <div className="top-artist-media">
          {/* Vinyl Disk that slides out on hover */}
          <div className="top-artist-vinyl">
            <div className="vinyl-groove groove-1"></div>
            <div className="vinyl-groove groove-2"></div>
            <div className="vinyl-groove groove-3"></div>
            <div className="vinyl-label">
              {/* Improve quality of label by replacing size params */}
              <img src={artist.image.replace(/=w\d+-h\d+/g, "=w500-h500")} alt="vinyl label" />
              <div className="vinyl-hole"></div>
            </div>
          </div>
          
          {/* Record Sleeve (Landscape Rectangle) */}
          <div className="top-artist-sleeve">
            {/* Improve poster quality */}
            <img src={artist.image.replace(/=w\d+-h\d+/g, "=w1000-h1000").replace("hqdefault", "maxresdefault")} alt={artist.title} />
            {/* Glossy overlay on the sleeve */}
            <div className="sleeve-gloss"></div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TopArtistCard;
