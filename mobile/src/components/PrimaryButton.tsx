import { Button } from './Button'

/**
 * The main call to action, now the chunky Button (V2). Kept so existing screens
 * read the same; `onDark` is the cream button for the deep-green screens.
 */
export function PrimaryButton({ label, onPress, disabled, variant = 'green' }: {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'green' | 'onDark'
}) {
  return <Button label={label} onPress={onPress} disabled={disabled} kind={variant === 'onDark' ? 'onDark' : 'primary'} />
}
