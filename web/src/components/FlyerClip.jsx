// The deal's product photo. (We used to cut the ad out of the flyer page itself; now the flyer
// lives on the grocer's own site, linked from the flyer card.)
export default function FlyerClip({ deal, className = '', maxHeight }) {
  return deal?.imageUrl ? (
    <img src={deal.imageUrl} alt={deal.name} loading="lazy" className={`mx-auto w-full object-contain ${className}`} style={{ maxHeight }} />
  ) : (
    <p className="p-6 text-center text-xs text-stone-400">No photo</p>
  )
}
