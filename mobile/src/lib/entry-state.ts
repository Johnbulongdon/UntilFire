/** Compare form values only; opening optional UI does not dirty a form. */
export function entryChanged<T extends Record<string, unknown>>(initial: T, current: T): boolean {
  return Object.keys(initial).some(key => initial[key] !== current[key])
}
