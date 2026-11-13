import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/jetbrains-mono/500.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Collect runtime errors so the exporter / QA can fail loudly instead of rendering broken frames.
const errors: string[] = [];
(window as unknown as { __MX_ERRORS__: string[] }).__MX_ERRORS__ = errors;
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

createRoot(document.getElementById('root')!).render(<App />);
