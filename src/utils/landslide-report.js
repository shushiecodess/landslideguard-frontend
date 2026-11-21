export function reportedAccuracyRadius(precision) {
  const match = /^(\d+(?:\.\d+)?)\s*(km|m)$/i.exec(precision?.trim() || '')
  if (!match) return null
  const radius = Number(match[1]) * (match[2].toLowerCase() === 'km' ? 1000 : 1)
  return Number.isFinite(radius) && radius > 0 ? radius : null
}
