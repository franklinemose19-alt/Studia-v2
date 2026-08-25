import { getSupabase } from './supabaseClient'

export type FeatureType = 'core' | 'premium'
export type PlanTier = 'explorer' | 'achiever' | 'achiever-plus' | 'excellence' | 'valedictorian'

export interface AccessInfo {
  userId: string | null
  currentPlan: string | null
  subscriptionStatus: string | null
  freeCreditsUsed: number
  purchasedMinutesRemaining: number
  minutesAllowance: number
  minutesUsed: number
  periodEnd: string | null
  planLocked: boolean
}

export const emptyAccess: AccessInfo = {
  userId: null, currentPlan: null, subscriptionStatus: null,
  freeCreditsUsed: 0, purchasedMinutesRemaining: 0, minutesAllowance: 0,
  minutesUsed: 0, periodEnd: null, planLocked: false,
}

const EXPLORER_LIFETIME_LIMIT = 3

// Read-only — for display (remaining minutes, plan badges) and an
// OPTIMISTIC pre-check so the UI can show the paywall instantly without a
// network round-trip. This is NOT the security boundary. Real enforcement
// happens server-side, atomically, inside consume_ai_minutes() on every
// AI-calling endpoint — the frontend can never write these fields
// directly (RLS blocks it).
export const loadAccess = async (cachedUserId?: string | null): Promise<AccessInfo> => {
  try {
    const client = await getSupabase()
    let uid = cachedUserId
    if (!uid) {
      const { data: { user } } = await client.auth.getUser()
      uid = user?.id
    }
    if (!uid) return emptyAccess

    const { data } = await client
      .from('users')
      .select('current_plan,subscription_status,free_ai_credits_used,purchased_minutes_remaining,lecture_allowance,lectures_used,period_end,plan_locked')
      .eq('auth_id', uid)
      .maybeSingle()

    return {
      userId: uid,
      currentPlan: data?.current_plan || 'explorer',
      subscriptionStatus: data?.subscription_status || null,
      freeCreditsUsed: data?.free_ai_credits_used || 0,
      purchasedMinutesRemaining: data?.purchased_minutes_remaining || 0,
      minutesAllowance: data?.lecture_allowance || 0,
      minutesUsed: data?.lectures_used || 0,
      periodEnd: data?.period_end || null,
      planLocked: data?.plan_locked || false,
    }
  } catch (err) {
    console.error('Failed to load access info:', err)
    return emptyAccess
  }
}

export const isActiveSubscription = (a: AccessInfo) =>
  ['excellence', 'valedictorian'].includes(a.currentPlan || '') && a.subscriptionStatus === 'active'

export const isPremiumPlan = (a: AccessInfo) =>
  a.currentPlan === 'valedictorian' && a.subscriptionStatus === 'active'

export const isUnlimitedPlan = isActiveSubscription

export const explorerLecturesRemaining = (a: AccessInfo) =>
  Math.max(0, EXPLORER_LIFETIME_LIMIT - (a.freeCreditsUsed || 0))

export const freeCreditsRemaining = explorerLecturesRemaining

export const subscriptionMinutesRemaining = (a: AccessInfo) =>
  Math.max(0, (a.minutesAllowance || 0) - (a.minutesUsed || 0))

export const totalMinutesAvailable = (a: AccessInfo): number => {
  if (isActiveSubscription(a)) return subscriptionMinutesRemaining(a) + (a.purchasedMinutesRemaining || 0)
  return a.purchasedMinutesRemaining || 0
}

export const getPlanLabel = (plan: string | null) => {
  switch (plan) {
    case 'explorer': return '🌍 Explorer'
    case 'achiever': return '🎯 Achiever'
    case 'achiever-plus': return '🎯 Achiever+'
    case 'excellence': return '🚀 Excellence'
    case 'valedictorian': return '🏆 Valedictorian'
    default: return '🌍 Explorer'
  }
}

export const getPlanColor = (plan: string | null) => {
  switch (plan) {
    case 'explorer': return 'text-gray-400'
    case 'achiever': return 'text-light-blue'
    case 'achiever-plus': return 'text-light-blue'
    case 'excellence': return 'text-mint'
    case 'valedictorian': return 'text-warning'
    default: return 'text-gray-400'
  }
}

export type AccessResult =
  | { allowed: true; source: 'paid_subscription' | 'purchased_minutes' | 'explorer_free' }
  | { allowed: false; reason: 'explorer_locked' | 'no_minutes_left' | 'needs_premium' }

// Optimistic UI check only, minutes-aware. estimatedMinutes lets the
// Recording page warn BEFORE hitting record if a lecture is obviously
// going to exceed what's left — the server independently re-verifies and
// true-ups against the real duration on every request regardless.
export const checkAccess = (access: AccessInfo, feature: FeatureType, estimatedMinutes: number = 1): AccessResult => {
  if (access.planLocked && !isActiveSubscription(access) && (access.purchasedMinutesRemaining || 0) <= 0) {
    return { allowed: false, reason: 'explorer_locked' }
  }
  if (isActiveSubscription(access)) {
    if (feature === 'premium' && !isPremiumPlan(access)) return { allowed: false, reason: 'needs_premium' }
    if (subscriptionMinutesRemaining(access) > 0 || (access.purchasedMinutesRemaining || 0) > 0) {
      return { allowed: true, source: subscriptionMinutesRemaining(access) >= estimatedMinutes ? 'paid_subscription' : 'purchased_minutes' }
    }
    return { allowed: false, reason: 'no_minutes_left' }
  }
  if ((access.purchasedMinutesRemaining || 0) > 0) return { allowed: true, source: 'purchased_minutes' }
  if (explorerLecturesRemaining(access) > 0) return { allowed: true, source: 'explorer_free' }
  return { allowed: false, reason: 'explorer_locked' }
}

// consumeCredit(), grantLiteBonusCredit(), and paidLecturesRemaining() are
// intentionally gone — real consumption now happens exclusively
// server-side, atomically, inside api/_utils/aiCredits.js as part of each
// AI request. Referral bonuses are granted server-side via
// verify_referral_for_user(). Neither path touches the client at all.
