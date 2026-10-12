import { useState, type UIEvent } from 'react'

/** Swipeable square image carousel. Renders a plain image when there's only one. */
export default function PhotoCarousel({
  urls,
  alt,
}: {
  urls: string[]
  alt: string
}) {
  const [index, setIndex] = useState(0)

  if (urls.length === 0) {
    return <div className="aspect-square w-full bg-raised" />
  }

  if (urls.length === 1) {
    return (
      <img
        src={urls[0]}
        alt={alt}
        loading="lazy"
        className="aspect-square w-full bg-raised object-cover"
      />
    )
  }

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }

  return (
    <div className="relative">
      <div
        onScroll={onScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto"
      >
        {urls.map((u, i) => (
          <img
            key={i}
            src={u}
            alt={`${alt} ${i + 1}`}
            loading="lazy"
            className="aspect-square w-full shrink-0 snap-center bg-raised object-cover"
          />
        ))}
      </div>

      <span className="glass absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">
        {index + 1}/{urls.length}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
