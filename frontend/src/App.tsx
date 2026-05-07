import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Landing } from '@/pages/Landing'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'
import { AppLoader } from '@/components/layout'
import { ThemeToggle } from '@/components/layout'

function App() {
  const { loading: authLoading } = useAuth()
  const [appLoaded, setAppLoaded] = useState(false)
  const [loaderMounted, setLoaderMounted] = useState(true)

  const showLoader = authLoading || !appLoaded

  return (
    <>
      {loaderMounted && (
        <AppLoader
          visible={showLoader}
          onFadeComplete={() => setLoaderMounted(false)}
        />
      )}
      <Routes>
        <Route path="/" element={<Landing onLoaded={() => setAppLoaded(true)} />} />
        <Route path="/home/*" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ThemeToggle />
    </>
  )
}

export default App
