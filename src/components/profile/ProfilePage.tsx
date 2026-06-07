import React, { useState, useEffect } from "react";
import "./profilepage.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getPosterUrl } from "../../utils/imageUtils";
import { getBaseUrl } from "../../api/client";

export const ProfilePage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");

  // Settings
  const [country, setCountry] = useState(localStorage.getItem("ytm_country") || "ZZ");

  useEffect(() => {
    checkAuthStatus();
    
    const unlistenAuth = listen("auth-success", async () => {
      setAuthMessage("Authentication successful! Loading profile...");
      await checkAuthStatus();
      window.dispatchEvent(new Event("auth-changed"));
      
      // Trigger native DB sync to YouTube
      import('../../store/useLibraryStore').then(module => {
          module.useLibraryStore.getState().syncLocalDataToYouTube();
      });
    });

    return () => {
      unlistenAuth.then(f => f());
    };
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/auth/status`);
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchAccount();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccount = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/account`);
      const data = await res.json();
      setAccount(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCountry(val);
    localStorage.setItem("ytm_country", val);
    window.dispatchEvent(new Event("auth-changed"));
  };

  const openYouTubeLogin = async () => {
    setAuthError("");
    setAuthMessage("Opening YouTube Music login window...");
    try {
      await invoke("open_youtube_login");
      setAuthMessage("Please log in. This window will close automatically once successful.");
    } catch (err: any) {
      setAuthError("Failed to open login window: " + String(err));
      setAuthMessage("");
    }
  };

  const logout = async () => {
    try {
      // In a native app, logout might also mean clearing the webview cookies, 
      // but for now we just clear the browser.json backend side.
      await fetch(`${getBaseUrl()}/auth/logout`, { method: "POST" });
      setIsAuthenticated(false);
      setAccount(null);
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-glass-panel">
        <h1 className="profile-title">Settings & Profile</h1>

        {loading && <div className="profile-loading">Loading...</div>}

        {!loading && !isAuthenticated && (
          <div className="auth-section">
            <h2 className="auth-subtitle">Connect to YouTube Music</h2>
            <p className="auth-desc">Log in to seamlessly sync your library, playlists, and history natively.</p>
            
            <div className="auth-native-container">
              <button className="auth-submit-btn native-login-btn" onClick={openYouTubeLogin}>
                Log In to Sync Automatically
              </button>
            </div>
            
            {authMessage && <div className="auth-message success">{authMessage}</div>}
            {authError && <div className="auth-error">{authError}</div>}
          </div>
        )}

        {!loading && isAuthenticated && (
          <div className="account-section">
            <div className="account-card">
              <div className="account-avatar">
                {account && getPosterUrl(account) ? (
                  <img src={getPosterUrl(account)} alt="Profile" />
                ) : (
                  <div className="account-avatar-placeholder"></div>
                )}
              </div>
              <div className="account-info">
                <h2>{account?.accountName || "Authenticated User"}</h2>
                <p>Successfully linked with YouTube Music.</p>
                <button className="auth-logout-btn" onClick={logout}>Sign Out</button>
              </div>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h2>Recommendations Region</h2>
          <p>Choose the country for Top Charts and Today's Hits recommendations.</p>
          <div className="settings-dropdown-wrapper">
            <select value={country} onChange={handleCountryChange} className="settings-dropdown">
              <option value="ZZ">Global (Worldwide)</option>
              <option value="US">United States</option>
              <option value="IN">India</option>
              <option value="GB">United Kingdom</option>
              <option value="BD">Bangladesh</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="BR">Brazil</option>
              <option value="AU">Australia</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
