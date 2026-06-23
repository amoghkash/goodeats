import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Add from './pages/Add'
import Settings from './pages/Settings'

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-stone-400">
      Loading…
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Loading />
  if (!session) return <Login />

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/add" element={<Add />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
