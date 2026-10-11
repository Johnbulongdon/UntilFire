import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Bouncy } from '@/components/Bouncy'
import { GoogleMark } from '@/components/GoogleMark'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { isPlausibleEmail, normaliseCode } from '@/engine'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'
import { Events, track } from '@/lib/analytics'

const RESEND_AFTER_S = 60

/** Sign in with an emailed 6-digit code: the same account and the same flow as untilfire.com/login. */
export default function SignIn() {
  const { session, sendCode, verifyCode, signInWithGoogle } = useAuth()
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const codeRef = useRef<TextInput>(null)

  // Signed in by any route (Google included): close the sheet.
  useEffect(() => { if (session) router.back() }, [session])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async () => {
    if (!isPlausibleEmail(email)) { haptic.warn(); setError('Check the email address.'); return }
    setBusy(true); setError('')
    track(Events.SIGNUP_STARTED, { method: 'email' })
    const problem = await sendCode(email)
    setBusy(false)
    if (problem) { haptic.warn(); setError(problem); return }
    haptic.success()
    setStage('code'); setCode(''); setWait(RESEND_AFTER_S)
    setTimeout(() => codeRef.current?.focus(), 350)
  }

  const verify = async (value = code) => {
    const token = normaliseCode(value)
    if (token.length < 6) { setError('Enter the code from the email.'); return }
    setBusy(true); setError('')
    const problem = await verifyCode(email, token)
    setBusy(false)
    if (problem) { haptic.warn(); setError(problem); return }
    haptic.success()
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row justify-end px-5 pt-2">
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Text className="text-[16px] font-semibold text-ink-2">Cancel</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-6">
          {stage === 'email' ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text className="font-display text-[32px] font-bold leading-10 tracking-tight text-ink">Sign in to UntilFire</Text>
              <Text className="mt-3 text-[16px] leading-6 text-ink-2">
                The same account as untilfire.com. We'll email you a 6-digit code, no password needed.
              </Text>
              <TextInput
                accessibilityLabel="Email"
                className="mt-8 rounded-control border-2 border-border-2 bg-card px-4 py-4 text-[17px] text-ink"
                style={{ fontFamily: 'Manrope_500Medium' }}
                placeholder="you@example.com"
                placeholderTextColor={colors.ink3}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoFocus
                value={email}
                onChangeText={t => { setEmail(t); setError('') }}
                onSubmitEditing={send}
                returnKeyType="send"
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInRight.duration(380)}>
              <Text className="font-display text-[32px] font-bold leading-10 tracking-tight text-ink">Check your email</Text>
              <Text className="mt-3 text-[16px] leading-6 text-ink-2">
                We sent a code to <Text className="font-bold text-ink">{email.trim()}</Text>. It can take a minute to arrive.
              </Text>
              <TextInput
                ref={codeRef}
                accessibilityLabel="Code"
                className="mt-8 rounded-control border-2 border-border-2 bg-card px-4 py-4 text-center text-[30px] text-ink"
                style={{ fontFamily: 'DMMono_500Medium', letterSpacing: 8 }}
                placeholder="000000"
                placeholderTextColor={colors.border2}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChangeText={t => {
                  const digits = normaliseCode(t)
                  setCode(digits); setError('')
                  // Six digits in (typed or autofilled from Mail): check straight away.
                  if (digits.length === 6) verify(digits)
                }}
              />
              <View className="mt-4 flex-row justify-between">
                <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setStage('email'); setError('') }} hitSlop={8}>
                  <Text className="text-[14px] font-semibold text-ink-2">Use a different email</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={wait > 0 || busy} onPress={send} hitSlop={8}>
                  <Text className={`text-[14px] font-bold ${wait > 0 ? 'text-ink-3' : 'text-pos-ink'}`}>
                    {wait > 0 ? `Send again in ${wait}s` : 'Send a new code'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {error ? <Text accessibilityRole="alert" className="mt-4 text-[14px] text-neg-ink">{error}</Text> : null}
        </View>

        <View className="px-6 pb-4">
          {busy ? (
            <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
          ) : stage === 'email' ? (
            <View style={{ gap: 12 }}>
              <PrimaryButton label="Email me a sign-in code" onPress={send} disabled={!email.trim()} />
              <Bouncy
                accessibilityRole="button"
                onPress={async () => {
                  haptic.press(); setError(''); setBusy(true)
                  track(Events.SIGNUP_STARTED, { method: 'google' })
                  const problem = await signInWithGoogle()
                  setBusy(false)
                  if (problem) { haptic.warn(); setError(problem) }
                }}
              >
                <View className="h-14 flex-row items-center justify-center gap-2 rounded-full border border-border-2 bg-card">
                  <GoogleMark />
                  <Text className="text-[17px] font-bold text-ink">Continue with Google</Text>
                </View>
              </Bouncy>
            </View>
          ) : (
            <PrimaryButton label="Sign in" onPress={() => verify()} disabled={normaliseCode(code).length < 6} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
