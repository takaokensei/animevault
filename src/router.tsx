import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Library from './pages/Library';
import AnimeDetail from './pages/AnimeDetail';
import { ProfilePage } from './pages/ProfilePage';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export function AppRouter() {
  return (
    <BrowserRouter>
      {/* Sidebar fixa na lateral */}
      <Sidebar />
      
      {/* Paleta de Comandos Global dentro do contexto de rotas */}
      <CommandPalette />

      {/* Conteúdo principal com margem para a sidebar */}
      <main className="ml-20 min-h-screen">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={
              <ErrorBoundary key="library">
                <Library />
              </ErrorBoundary>
            } />
            <Route path="/anime/:id" element={
              <ErrorBoundary key="anime-detail">
                <AnimeDetail />
              </ErrorBoundary>
            } />
            <Route path="/profile" element={
              <ErrorBoundary key="profile">
                <ProfilePage />
              </ErrorBoundary>
            } />
          </Routes>
        </ErrorBoundary>
      </main>
    </BrowserRouter>
  );
}
