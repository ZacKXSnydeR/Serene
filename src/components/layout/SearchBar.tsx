import { useRef } from "react";
import "./searchbar.css";

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSearch: () => void;
}

export function SearchBar({ query, onChange, onSearch }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="searchbar-container" onClick={handleContainerClick}>
      <svg 
        className="searchbar-icon" 
        fill="none" 
        stroke="#F26B50" 
        strokeWidth="2.5" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input 
        ref={inputRef}
        type="text" 
        placeholder="Search music, artists..." 
        className="searchbar-input"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
