import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App.jsx'

// Sem StrictMode: câmera e motor do jogo são singletons presos ao DOM.
createRoot(document.getElementById('root')).render(<App />)
