import { Routes, Route } from 'react-router-dom'
import { Profile } from './Profile'
import { Question } from './Question'
import { Résultat } from './Résultat'

export function Home() {
  return (
    <div>
      <Routes>
        <Route path="profile" element={<Profile />} />
        <Route path="question" element={<Question />} />
        <Route path="résultat" element={<Résultat />} />
      </Routes>
    </div>
  )
}
