import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Add from './pages/Add'
import Settings from './pages/Settings'
import Notes from './pages/Notes'

function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <span className="text-brand animate-pulse font-display text-3xl font-bold">
        GoodEats
      </span>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Loading />
  if (!session) return <Login />

  return (
    // Pin the shell to the screen edges rather than sizing it with 100dvh:
    // in an iOS home-screen (standalone) PWA, 100dvh stops short of the
    // bottom edge, which left the nav floating above a blank strip.
    <div className="fixed inset-0 mx-auto flex max-w-md flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/add" element={<Add />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
