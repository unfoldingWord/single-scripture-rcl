import * as isEqual from 'deep-equal'

/**
 * do quick comparison of two maps
 * @param {Map} map1
 * @param map2
 * @return {boolean} - true if same
 */
export function areMapsTheSame( map1, map2 ) {
  if (map1.size !== map2.size) {
    return false
  }

  const keys1 = Array.from( map1.keys() )
  const keys2 = Array.from( map2.keys() )

  if (!isEqual(keys1, keys2)) {
    return false
  }

  let different = false

  for (const key of keys1) {
    const value1 = map1.get(key)
    const value2 = map2.get(key)

    if (!isEqual(value1, value2)) {
      different = true
      break
    }
  }

  return !different
}

