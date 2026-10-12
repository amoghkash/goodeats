/** Gradients in the brand's family, picked per person so each of you keeps a consistent color. */
const GRADIENTS = [
  'from-berry-400 to-berry-700',
  'from-fuchsia-400 to-berry-700',
  'from-pink-300 to-berry-600',
  'from-violet-400 to-berry-600',
]

function gradientFor(id: string) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

const SIZES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-24 w-24 text-4xl',
}

export default function Avatar({
  id,
  name,
  size = 'sm',
  ring = false,
}: {
  id: string
  name: string
  size?: keyof typeof SIZES
  /** Wrap in a thin brand-gradient ring (used on the profile hero). */
  ring?: boolean
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const circle = (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-display font-semibold text-white shadow-sm ${gradientFor(id)} ${SIZES[size]}`}
    >
      {initial}
    </span>
  )
  if (!ring) return circle
  return (
    <span className="bg-brand rounded-full p-[3px]">
      <span className="block rounded-full bg-canvas p-[3px]">{circle}</span>
    </span>
  )
}
