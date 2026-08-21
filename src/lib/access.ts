import { getSupabase } from './supabaseClient'

export type FeatureType = 'core' | 'premium'
export type PlanTier = 'explorer' | 'achiever' | 'excellence' | 'valedictorian'

export interface AccessInfo {
  userId: string | null
  currentPlan: string | null
  subscriptionStatus: string | null
  freeCreditsUsed: number
  liteBonusCredits: number
  lectureAllowance: number
  lecturesUsed: number
  periodEnd: string | null
  planLocked: boolean
}

export const emptyAccess: AccessInfo = {
  userId: null, currentPlan: null, subscriptionStatus: null,
  freeCreditsUsed: 0, liteBonusCredits: 0, lectureAllowance: 0,
  lecturesUsed: 0, periodEnd: null, planLocked: false,
}

const EXPLORER_LIFETIME_LIMIT = 3

// Read-only — for display purposes (remaining counts, plan badges, and an
// OPTIMISTIC pre-check so the UI can show the upgrade modal instantly
// without waiting on a network round-trip). This is NOT the security
// boundary anymore. The real enforcement happens server-side, atomically,
// inside consume_ai_credit() on every AI-calling endpoint — the frontend
// can never write these fields directly (RLS blocks it).
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
      .select('current_plan,subscription_status,free_ai_credits_used,lite_bonus_credits,lecture_allowance,lectures_used,period_end,plan_locked')
      .eq('auth_id', uid)
      .maybeSingle()

    return {
      userId: uid,
      currentPlan: data?.current_plan || 'explorer',
      subscriptionStatus: data?.subscription_status || null,
      freeCreditsUsed: data?.free_ai_credits_used || 0,
      liteBonusCredits: data?.lite_bonus_credits || 0,
      lectureAllowance: data?.lecture_allowance || 0,
      lecturesUsed: data?.lectures_used || 0,
      periodEnd: data?.period_end || null,
      planLocked: data?.plan_locked || false,
    }
  } catch (err) {
    console.error('Failed to load access info:', err)
    return emptyAccess
  }
}

export const isActivePaidPlan = (a: AccessInfo) =>
  ['excellence', 'valedictorian'].includes(a.currentPlan || '') && a.subscriptionStatus === 'active'

export const isPremiumPlan = (a: AccessInfo) =>
  a.currentPlan === 'valedictorian' && a.subscriptionStatus === 'active'

export const isUnlimitedPlan = isActivePaidPlan

export const explorerLecturesRemaining = (a: AccessInfo) =>
  Math.max(0, EXPLORER_LIFETIME_LIMIT - (a.freeCreditsUsed || 0))

export const freeCreditsRemaining = explorerLecturesRemaining

export const paidLecturesRemaining = (a: AccessInfo) =>
  Math.max(0, (a.lectureAllowance || 0) - (a.lecturesUsed || 0))

export const getPlanLabel = (plan: string | null) => {
  switch (plan) {
    case 'explorer': return '🌍 Explorer'
    case 'achiever': return '🎯 Achiever'
    case 'excellence': return '🚀 Excellence'
    case 'valedictorian': return '🏆 Valedictorian'
    default: return '🌍 Explorer'
  }
}

export const getPlanColor = (plan: string | null) => {
  switch (plan) {
    case 'explorer': return 'text-gray-400'
    case 'achiever': return 'text-light-blue'
    case 'excellence': return 'text-mint'
    case 'valedictorian': return 'text-warning'
    default: return 'text-gray-400'
  }
}

export type AccessResult =
  | { allowed: true; source: 'paid_subscription' | 'achiever_session' | 'explorer_free' | 'bonus' }
  | { allowed: false; reason: 'explorer_locked' | 'no_lectures_left' | 'needs_premium' }

// Optimistic UI check only — lets you show/hide buttons instantly.
// The server independently re-verifies everything for real on every request.
export const checkAccess = (access: AccessInfo, feature: FeatureType): AccessResult => {
  if (access.planLocked) return { allowed: false, reason: 'explorer_locked' }
  if (isActivePaidPlan(access)) {
    if (feature === 'premium' && !isPremiumPlan(access)) {
      if (access.liteBonusCredits > 0) return { allowed: true, source: 'bonus' }
      if (explorerLecturesRemaining(access) > 0) return { allowed: true, source: 'explorer_free' }
      return { allowed: false, reason: 'needs_premium' }
    }
    if (paidLecturesRemaining(access) > 0) return { allowed: true, source: 'paid_subscription' }
    return { allowed: false, reason: 'no_lectures_left' }
  }
  if (access.liteBonusCredits > 0) return { allowed: true, source: 'bonus' }
  if (explorerLecturesRemaining(access) > 0) return { allowed: true, source: 'explorer_free' }
  return { allowed: false, reason: 'explorer_locked' }
}

// consumeCredit() and grantLiteBonusCredit() are intentionally removed.
// Credit consumption now happens exclusively server-side, atomically, as
// part of each AI request — see api/_utils/aiCredits.js. Referral bonuses
// are granted server-side in api/referral.js using the service-role key.
// Neither of those paths is affected by the client-side RLS tightening.
