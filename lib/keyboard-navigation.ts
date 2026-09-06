/** Invoke only the visible step's primary action, leaving native controls alone. */
export function advanceOnEnter(event: KeyboardEvent, root: HTMLElement) {
  if (event.key !== "Enter" || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.isContentEditable || target?.closest('button, a, select, textarea, [role="combobox"], [role="listbox"], [role="dialog"]')) return;
  const button = root.querySelector<HTMLButtonElement>('[data-primary-next]');
  if (!button || button.disabled) return;
  event.preventDefault();
  button.click();
}
