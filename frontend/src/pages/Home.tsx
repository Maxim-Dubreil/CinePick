import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Profile } from './Profile'
import { Question } from './Question'
import { Résultat } from './Résultat'

export function Home() {
  return (
    <AppLayout>
      <Routes>
        <Route path="profile" element={<Profile />} />
        <Route path="question" element={<Question />} />
        <Route path="résultat" element={<Résultat />} />
      </Routes>
    </AppLayout>
  )
}
