// The deal's actual flyer ad (product, price, fine print), drawn from Flipp's flyer tiles.
// Deals without clip info fall back to the product photo.
import { clipTiles } from '../lib/flyerClip'

export default function FlyerClip({ deal, className = '', maxHeight, sharp }) {
  if (!deal?.clip?.box) {
    return deal?.imageUrl ? (
      <img src={deal.imageUrl} alt={deal.name} className={`w-full object-contain ${className}`} style={{ maxHeight }} />
    ) : (
      <p className="p-6 text-center text-xs text-stone-400">No flyer image</p>
    )
  }
  const { tiles, aspect } = clipTiles(deal.clip, sharp)
  return (
    <div className={`mx-auto w-full ${className}`} style={{ maxWidth: maxHeight ? `calc(${maxHeight} * ${aspect})` : undefined }}>
      <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: aspect }} role="img" aria-label={`${deal.merchant} flyer: ${deal.name}`}>
        {tiles.map((x) => (
          <img
            key={x.src}
            src={x.src}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute max-w-none"
            style={{ left: `${x.left}%`, top: `${x.top}%`, width: `${x.width + 0.05}%`, height: `${x.height + 0.05}%` }}
          />
        ))}
      </div>
    </div>
  )
}
