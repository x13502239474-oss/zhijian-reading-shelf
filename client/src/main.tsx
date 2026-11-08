import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA 注册失败不影响阅读功能
    });
  });
}
