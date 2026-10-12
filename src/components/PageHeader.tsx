import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from './icons'

/** Sticky frosted header shared by every screen. */
export default function PageHeader({
  title,
  back,
  right,
  children,
}: {
  title?: ReactNode
  /** Show a back button; a string navigates there, `true` goes back in history. */
  back?: string | true
  right?: ReactNode
  /** Custom content in place of the title (e.g. an avatar + name). */
  children?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <header className="glass safe-top sticky top-0 z-20 border-b border-line">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button
            onClick={() => (back === true ? navigate(-1) : navigate(back))}
            aria-label="Back"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-stone-300 transition active:bg-white/10"
          >
            <BackIcon className="h-6 w-6" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {children ?? (
            <h1 className="truncate font-display text-[22px] font-semibold tracking-tight">
              {title}
            </h1>
          )}
        </div>
        {right}
      </div>
    </header>
  )
}
