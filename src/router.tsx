import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Library from './pages/Library';
import AnimeDetail from './pages/AnimeDetail';
import { ProfilePage } from './pages/ProfilePage';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/CommandPalette';

export function AppRouter() {
  return (
    <BrowserRouter>
      {/* Sidebar fixa na lateral */}
      <Sidebar />
      
      {/* Paleta de Comandos Global dentro do contexto de rotas */}
      <CommandPalette />


      {/* Conteúdo principal com margem para a sidebar */}
      <main className="ml-20 min-h-screen">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
