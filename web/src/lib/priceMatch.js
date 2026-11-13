// Which flyers each price-matching store accepts at the till (Ontario / Ottawa).
// Policies change and vary by location, so each entry says where it came from; when a store
// posts its own competitor list, that list wins. Checked October 2026:
//  - FreshCo "Low Price Guarantee": 1¢ less than up to four discount competitors in the area
//    (Ontario: No Frills, Food Basics, Real Canadian Superstore, Walmart); 4 units per item.
//    https://blog.flipp.com/does-freshco-price-match-everything-you-need-to-know/
//  - No Frills "Won't Be Beat": matches major supermarket competitors listed at the store.
//  - Real Canadian Superstore: exact match on major supermarket competitors in the trade area.
//  - Giant Tiger "Ad Match Guarantee": 1¢ less than a local competitor's flyer.
//    https://www.savvynewcanadians.com/price-matching-canada/
//  - Walmart (since 2020), Food Basics, Metro and Sobeys don't price match, but their flyers
//    can be matched elsewhere.
const MAJOR = ['Walmart', 'Food Basics', 'FreshCo', 'No Frills', 'Real Canadian Superstore', 'Metro', 'Sobeys', 'Loblaws', 'Your Independent Grocer', 'Giant Tiger']

export const PRICE_MATCH = {
  FreshCo: {
    beat: 0.01,
    accepts: ['No Frills', 'Food Basics', 'Real Canadian Superstore', 'Walmart'],
    optional: [],
    note: 'Beats the flyer price by 1¢. Only these four competitors, max 4 of each item.',
  },
  'No Frills': {
    beat: 0,
    accepts: MAJOR.filter((s) => s !== 'No Frills'),
    optional: ['Farm Boy'],
    note: 'Matches major supermarkets listed at your store. Check the list by the tills.',
  },
  'Real Canadian Superstore': {
    beat: 0,
    accepts: MAJOR.filter((s) => s !== 'Real Canadian Superstore'),
    optional: ['Farm Boy'],
    note: 'Exact match on major supermarkets in the area.',
  },
  'Giant Tiger': {
    beat: 0.01,
    accepts: MAJOR.filter((s) => s !== 'Giant Tiger'),
    optional: ['Farm Boy'],
    note: "Beats a local competitor's flyer price by 1¢.",
  },
}

export const MATCH_STORES = Object.keys(PRICE_MATCH)

/** Flyers usable when shopping at `store`: its own plus the competitors it accepts. */
export function matchSources(store, extras = []) {
  const p = PRICE_MATCH[store]
  if (!p) return null
  return [store, ...p.accepts, ...p.optional.filter((s) => extras.includes(s))]
}

// Every store above is in Ontario, and none of them match a Quebec flyer (Metro and IGA run
// separate Quebec flyers that Flipp also shows near Ottawa).
export function matchableDeals(deals, store, extras = []) {
  const ok = matchSources(store, extras)
  return ok ? deals.filter((d) => ok.includes(d.merchant) && d.province !== 'QC' && !membersOnly(d) && !onlineOnly(d)) : deals
}

// A loyalty-member price ("Members save $2", PC Optimum member prices, Metro's "prix membre") is
// only for that chain's members, so another store won't match it. Points offers ("Get 1,000 PC
// Optimum pts") are fine: the shelf price is the flyer price and the points are extra.
const MEMBER = /\(member price\)|\bmembers?\s+(save|price|only|exclusive)|prix membre|membres? (économisent|seulement)|exclusifs? aux membres/i
export const membersOnly = (d) => MEMBER.test(`${d.priceLabel || ''} ${d.priceText || ''} ${d.saleStory || ''}`)

// Online prices (Costco's "Online Price", web exclusives) aren't in the store or its flyer.
const ONLINE = /\bonline\b|en ligne|web exclusive|exclusivité web/i
export const onlineOnly = (d) => ONLINE.test(`${d.priceText || ''} ${d.saleStory || ''}`)

/** Ontario postal codes start with K, L, M, N or P. */
export const inOntario = (postal) => /^[KLMNP]/i.test((postal || '').trim())

/** A Quebec flyer seen from Ontario: Ontario stores won't price match it. */
export const otherProvince = (deal, postal) => deal.province === 'QC' && inOntario(postal)

/**
 * Prefs with the store picks following the price-match store: choosing one selects the flyers
 * its cashiers accept; turning matching off goes back to every store.
 */
export function followMatch(next, prev) {
  const changed = next.matchAt !== prev?.matchAt || String(next.matchExtras || []) !== String(prev?.matchExtras || [])
  if (!changed) return next
  return { ...next, stores: next.matchAt ? matchSources(next.matchAt, next.matchExtras || []) : [] }
}

/** Saved prefs from before stores followed the match store: drop picks it won't accept. */
export function tidyMatch(p) {
  const ok = p?.matchAt && matchSources(p.matchAt, p.matchExtras || [])
  if (!ok) return p
  const stores = (p.stores || []).filter((s) => ok.includes(s))
  return { ...p, stores: stores.length ? stores : ok }
}
