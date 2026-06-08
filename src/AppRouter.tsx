import React, { useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ArtistPage } from './pages/ArtistPage';
import { AlbumPage } from './pages/AlbumPage';
import { LikedSongsPage } from './pages/LikedSongsPage';
import { HistoryPage } from './pages/HistoryPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { useLibraryStore } from './store/useLibraryStore';



export const AppRouter: React.FC = () => {
  const initLibrary = useLibraryStore((state) => state.initLibrary);

  useEffect(() => {
    initLibrary();
  }, [initLibrary]);

  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="artist/:id" element={<ArtistPage />} />
          <Route path="album/:id" element={<AlbumPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="liked" element={<LikedSongsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};
