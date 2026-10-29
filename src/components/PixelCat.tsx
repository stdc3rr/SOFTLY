type PixelCatProps = { mood?: 'sitting' | 'sleeping' | 'stretching'; alt?: string }

export function PixelCat({ mood = 'sitting', alt = '' }: PixelCatProps) {
  const face = mood === 'sleeping' ? '— —' : mood === 'stretching' ? '•ᴗ•' : '•ω•'
  return <div className={`pixel-cat ${mood}`} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
    <span className="cat-ears">◢ ◣</span><span className="cat-face">{face}</span><span className="cat-body">▰</span>
  </div>
}
