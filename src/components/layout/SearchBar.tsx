import { useState, useEffect, useRef } from "react";
import "./searchbar.css";

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSearch: (forcedQuery?: string) => void;
}

export function SearchBar({ query, onChange, onSearch }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const saveRecentSearch = (search: string) => {
    if (!search.trim()) return;
    const q = search.trim();
    let recents = [...recentSearches];
    recents = recents.filter(r => r !== q);
    recents.unshift(q);
    if (recents.length > 10) recents.pop();
    setRecentSearches(recents);
    try {
      localStorage.setItem("recent_searches", JSON.stringify(recents));
    } catch (e) {}
  };

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5050/search/suggestions?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const displayedSuggestions = query.trim() ? suggestions : recentSearches;

  const triggerSearch = (searchStr: string) => {
    saveRecentSearch(searchStr);
    onSearch(searchStr);
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < displayedSuggestions.length) {
        const selected = displayedSuggestions[activeIndex];
        onChange(selected);
        setShowSuggestions(false);
        triggerSearch(selected);
      } else {
        setShowSuggestions(false);
        triggerSearch(query);
      }
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < displayedSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    triggerSearch(suggestion);
  };

  // Keep dropdown open when clicking inside, close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        // give a small delay to allow suggestion click to fire
        setTimeout(() => setShowSuggestions(false), 150);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="searchbar-wrapper" style={{ position: "relative" }}>
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
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowSuggestions(true);
          }}
        />
      </div>

      {showSuggestions && displayedSuggestions.length > 0 && (
        <div className="searchbar-dropdown">
          {displayedSuggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className={`searchbar-suggestion ${idx === activeIndex ? "active" : ""}`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {!query.trim() ? (
                <svg className="searchbar-suggestion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="searchbar-suggestion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
