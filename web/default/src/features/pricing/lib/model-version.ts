const versionPattern = /\d+(?:[.-]\d+)*/

export function compareModelVersionsNewestFirst(a: string, b: string): number {
  const aVersion = a.match(versionPattern)?.[0].split(/[.-]/).map(Number) ?? []
  const bVersion = b.match(versionPattern)?.[0].split(/[.-]/).map(Number) ?? []
  const length = Math.max(aVersion.length, bVersion.length)

  for (let index = 0; index < length; index++) {
    const difference = (bVersion[index] ?? 0) - (aVersion[index] ?? 0)
    if (difference !== 0) return difference
  }

  return a.localeCompare(b)
}
