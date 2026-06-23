import { NavLink } from 'react-router-dom'

const linkBase =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition'

function iconClass(active: boolean) {
  return active ? 'text-orange-500' : 'text-stone-400'
}

export default function BottomNav() {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-center border-t border-stone-800 bg-stone-900/95 backdrop-blur">
      <NavLink to="/" end className={linkBase}>
        {({ isActive }) => (
          <>
            <svg
              className={`h-6 w-6 ${iconClass(isActive)}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5 12 3l9 6.5" />
              <path d="M5 10v10h14V10" />
            </svg>
            <span className={iconClass(isActive)}>Feed</span>
          </>
        )}
      </NavLink>

      <NavLink to="/add" className={linkBase} aria-label="Add a meal">
        {({ isActive }) => (
          <>
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${
                isActive ? 'bg-orange-600' : 'bg-orange-500'
              }`}
            >
              <svg
                className="h-7 w-7 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </>
        )}
      </NavLink>

      <NavLink to="/settings" className={linkBase}>
        {({ isActive }) => (
          <>
            <svg
              className={`h-6 w-6 ${iconClass(isActive)}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
            <span className={iconClass(isActive)}>Settings</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}
