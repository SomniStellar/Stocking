export const UNTAGGED_KEY = '__UNTAGGED__'
export const UNTAGGED_LABEL = 'Untagged'

export function parseTags(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function getTagOptions(values: unknown[]) {
  const seen = new Map<string, string>()

  values.flatMap(parseTags).forEach((tag) => {
    const normalized = tag.toLowerCase()
    if (!seen.has(normalized)) {
      seen.set(normalized, tag)
    }
  })

  return [...seen.entries()]
    .sort((left, right) => left[1].localeCompare(right[1]))
    .map(([value, label]) => ({ value, label }))
}

export function matchesTagFilter(value: unknown, activeTag: string) {
  if (activeTag === 'all') {
    return true
  }

  const tags = parseTags(value).map((tag) => tag.toLowerCase())
  return tags.includes(activeTag)
}

export function getPrimaryTag(value: unknown) {
  const tags = parseTags(value)
  return tags[0] ?? UNTAGGED_KEY
}

export function getGroupLabel(tag: string) {
  return tag === UNTAGGED_KEY ? UNTAGGED_LABEL : tag
}
