import { mediaUrl } from '../api/client'

/** A barber's photo, or their initials when they have none. */
export function Avatar({ name, url, size = 56 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size }
  if (url) {
    return <img src={mediaUrl(url)} alt="" style={style} className="shrink-0 rounded-xl bg-surface-2 object-cover" />
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-surface-2 font-display font-extrabold text-accent"
    >
      {initials(name)}
    </span>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}
