import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/fira-sans/greek-400.css'
import '@fontsource/fira-sans/latin-400.css'
import '@fontsource/fira-sans/greek-500.css'
import '@fontsource/fira-sans/latin-500.css'
import '@fontsource/fira-sans/greek-600.css'
import '@fontsource/fira-sans/latin-600.css'
import '@fontsource/fira-sans/greek-700.css'
import '@fontsource/fira-sans/latin-700.css'
import '@fontsource/fira-sans-condensed/greek-600.css'
import '@fontsource/fira-sans-condensed/latin-600.css'
import '@fontsource/fira-sans-condensed/greek-800.css'
import '@fontsource/fira-sans-condensed/latin-800.css'
import './i18n'
import './index.css'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 30_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
