import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getOptionalSupabaseEnv, getSupabaseEnvErrorMessage } from './env'

const optionalEnv = getOptionalSupabaseEnv()
const missingEnvMessage = getSupabaseEnvErrorMessage()

function createMissingEnvClient() {
  const fail = async () => ({
    data: null,
    error: new Error(missingEnvMessage),
  })

  const query = {
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    single: fail,
    maybeSingle: fail,
    then: (resolve: (value: { data: null; error: Error }) => unknown) =>
      Promise.resolve({ data: null, error: new Error(missingEnvMessage) }).then(resolve),
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      signInWithOAuth: fail,
      signInWithOtp: fail,
      verifyOtp: fail,
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: fail,
    },
    from: () => query,
  } as unknown as SupabaseClient
}

export const supabase = optionalEnv
  ? createClient(optionalEnv.url, optionalEnv.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fire-dashboard-auth',
        flowType: 'pkce',
      },
    })
  : createMissingEnvClient()

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

export const isAuthenticated = async () => {
  const user = await getCurrentUser()
  return !!user
}

export const getSubscription = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end')
    .eq('user_id', session.user.id)
    .single()
  return data
}

/**
 * Pro for this user, or Pro because their household is.
 *
 * The household check is a boolean over RPC rather than a read of the other
 * person's subscriptions row. A partner needs to know the household is Pro;
 * they do not need the amount, the status, the renewal date or the Stripe
 * IDs that come with the row. subscriptions' RLS stays owner-only.
 *
 * Own subscription first, so the common case costs no extra round trip, and
 * so a household lookup failing can only ever withhold a shared entitlement
 * — never someone's own.
 */
export const isPro = async () => {
  const sub = await getSubscription()
  if (sub?.status === 'active' && sub?.plan === 'pro') return true
  try {
    const { data } = await supabase.rpc('household_has_pro')
    return data === true
  } catch {
    return false
  }
}
