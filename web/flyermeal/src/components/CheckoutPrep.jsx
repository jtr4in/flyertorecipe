import { useState } from 'react'
import FlyerClip from '@f2r/components/FlyerClip'
import Sheet from '@f2r/components/Sheet'
import { flippUrl, money } from '@f2r/lib/stores'
import { estimate } from '../lib/estimate'
import TillMode from './TillMode'

// Price matching at the till is quickest from one place. "Show ads at the till" steps through every
// matched ad right here, so nothing needs opening first. Clipping each ad into Flipp's own shopping
// list stays as the other way, for cashiers who want to see Flipp.
export const toClip = (lines, postal) => lines.filter((l) => !l.checked && l.deal && flippUrl(l.deal, postal))
const byStore = (a, b) => a.deal.merchant.localeCompare(b.deal.merchant) || a.name.localeCompare(b.name)
export const isClipped = (l) => !!l.deal && l.clipped === l.deal.dealId

/** The cart at flyer prices: every item still to get that has an ad. */
export function cartEstimate(lines, pounds = {}) {
  const toGet = lines.filter((l) => !l.checked)
  const priced = toGet.map((l) => estimate(l.deal, pounds[l.name])).filter(Boolean)
  return {
    total: priced.reduce((sum, e) => sum + e.cost, 0),
    priced: priced.length,
    unpriced: toGet.length - priced.length,
    guessed: priced.some((e) => e.guessed),
  }
}

export default function CheckoutPrep({ open, onClose, lines, postal, pounds = {}, update }) {
  const [till, setTill] = useState(false)
  const ads = lines.filter((l) => !l.checked && l.deal).sort(byStore)
  const rows = toClip(lines, postal).sort(byStore)
  const done = rows.filter(isClipped).length
  const next = rows.find((l) => !isClipped(l))
  const cost = (l) => estimate(l.deal, pounds[l.name])
  const { total, priced, unpriced, guessed } = cartEstimate(lines, pounds)
  return (
    <Sheet open={open} onClose={onClose} title="Get ready to price match" tall>
      {priced > 0 && (
        <div className="mb-3 rounded-2xl bg-stone-50 p-3">
          <p className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-stone-600">Estimated total</span>
            <span className="text-2xl font-bold text-green-700">≈ {money(total)}</span>
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {priced} {priced === 1 ? 'item' : 'items'} at flyer prices, before tax. Priced by the pound for the amounts in your recipes
            {guessed ? ', or about a pound where it doesn\'t say' : ''}.{unpriced > 0 && ` ${unpriced} ${unpriced === 1 ? 'item has' : 'items have'} no flyer price and aren't counted.`}
          </p>
        </div>
      )}
      {ads.length > 0 && (
        <>
          <button onClick={() => setTill(true)} className="w-full rounded-2xl bg-green-700 py-3 font-semibold text-white">
            Show ads at the till ({ads.length})
          </button>
          <p className="mt-1.5 text-center text-xs text-stone-500">One ad per screen with the store, price and dates. Tap Next for the next one.</p>
          <p className="mt-5 text-sm font-semibold text-stone-700">Or clip them into Flipp</p>
        </>
      )}
      <p className="text-sm text-stone-600">
        For a cashier who wants to see Flipp: tap <b>Clip</b> on each ad there, then show Flipp's <b>Shopping List</b> at the till.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${rows.length ? (100 * done) / rows.length : 0}%` }} />
        </div>
        <span className="shrink-0 text-sm font-semibold text-stone-600">
          {done} of {rows.length} clipped
        </span>
      </div>
      {rows.length > 0 && !next && <p className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-medium text-green-800">✓ All set. At the till, open Flipp → Shopping List.</p>}
      <ul className="mt-3 space-y-2">
        {rows.map((l, i) => {
          const clipped = isClipped(l)
          const first = i === 0 || rows[i - 1].deal.merchant !== l.deal.merchant
          return (
            <li key={l.name}>
              {first && <p className="mt-3 mb-1 px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{l.deal.merchant}</p>}
              <div className={`flex items-center gap-3 rounded-2xl border p-2 ${l === next ? 'border-sky-400 ring-1 ring-sky-400' : 'border-stone-200'} ${clipped ? 'bg-stone-50' : 'bg-white'}`}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <FlyerClip deal={l.deal} maxHeight="3rem" sharp={200} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium capitalize ${clipped ? 'text-stone-400' : ''}`}>{l.name}</p>
                  <p className="truncate text-sm font-semibold text-green-700">{l.deal.priceLabel || l.deal.priceText}</p>
                  {cost(l)?.qty && (
                    <p className="text-xs text-stone-500">
                      {cost(l).guessed ? 'About ' : ''}
                      {cost(l).qty} ≈ {money(cost(l).cost)}
                    </p>
                  )}
                </div>
                <a
                  href={flippUrl(l.deal, postal)}
                  target="flipp"
                  rel="noreferrer"
                  onClick={() => update(l.name, { clipped: l.deal.dealId })}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${clipped ? 'text-sky-700' : 'bg-sky-500 text-white'}`}
                >
                  {clipped ? '✓ Clipped' : 'Clip in Flipp ↗'}
                </a>
              </div>
            </li>
          )
        })}
      </ul>
      {till && <TillMode lines={ads} postal={postal} onClose={() => setTill(false)} />}
      {!rows.length && <p className="mt-4 text-sm text-stone-500">Nothing on your list has a flyer ad yet.</p>}
    </Sheet>
  )
}
