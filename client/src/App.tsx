import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShelfProvider } from './hooks/useShelf';
import { ToastProvider } from './components/ui/ToastProvider';
import ShelfPage from './pages/ShelfPage';
import AddArticlePage from './pages/AddArticlePage';
import ReaderPage from './pages/ReaderPage';
import HighlightsPage from './pages/HighlightsPage';

export default function App() {
  return (
    <ToastProvider>
      <ShelfProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<ShelfPage />} />
            <Route path="/add" element={<AddArticlePage />} />
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route path="/highlights" element={<HighlightsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ShelfProvider>
    </ToastProvider>
  );
}
