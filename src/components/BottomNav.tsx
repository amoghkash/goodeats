import { NavLink } from 'react-router-dom'
import { HomeIcon, PlusIcon, SettingsIcon } from './icons'

const linkBase =
  'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition'

function tone(active: boolean) {
  return active ? 'text-orange-400' : 'text-stone-500'
}

export default function BottomNav() {
  return (
    <nav className="glass bottom-nav flex shrink-0 items-center border-t border-line px-6">
      <NavLink to="/" end className={linkBase}>
        {({ isActive }) => (
          <>
            <HomeIcon className={`h-6 w-6 ${tone(isActive)}`} />
            <span className={tone(isActive)}>Feed</span>
          </>
        )}
      </NavLink>

      <NavLink to="/add" className={linkBase} aria-label="Add a meal">
        {({ isActive }) => (
          <span
            className={`bg-brand flex h-12 w-16 items-center justify-center rounded-2xl text-white shadow-lg shadow-orange-500/30 transition active:scale-95 ${
              isActive ? 'ring-2 ring-orange-300/60 ring-offset-2 ring-offset-canvas' : ''
            }`}
          >
            <PlusIcon className="h-7 w-7" />
          </span>
        )}
      </NavLink>

      <NavLink to="/settings" className={linkBase}>
        {({ isActive }) => (
          <>
            <SettingsIcon className={`h-6 w-6 ${tone(isActive)}`} />
            <span className={tone(isActive)}>Settings</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}
