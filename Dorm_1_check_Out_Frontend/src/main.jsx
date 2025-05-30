import { StrictMode, createContext } from 'react'
import { createRoot } from 'react-dom/client'
import Main from './pages/Main/Main'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Main />
  </StrictMode>,
)
