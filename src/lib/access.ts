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
  userId: null,
  currentPlan: null,
  subscriptionStatus: null,
  freeCreditsUsed: 0,
  liteBonusCredits: 0,
  lectureAllowance: 0,
  lecturesUsed: 0,
  periodEnd: null,
  planLocked: false,
}

const EXPLORER_LIFETIME_LIMIT = 3

// ── Subscription expiry check ──────────────────────────────────────────────
// Runs every time access is loaded — silently reverts expired subscriptions
async function checkAndExpireSubscription(
  uid: string,
  plan: string | null,
  status: string | null,
  periodEnd: string | null
): Promise<{ plan: string; status: string } | null> {
  if (!['excellence', 'valedictorian'].includes(plan || '')) return null
  if (status !== 'active') return null
  if (!periodEnd) return null

  const now = new Date()
  const end = new Date(periodEnd)
  if (now <= end) return null

  // Subscription has expired — revert to explorer
  try {
    const client = await getSupabase()
    await client
      .from('users')
      .update({
        subscription_status: 'inactive',
        current_plan: 'explorer',
        lecture_allowance: 0,
        lectures_used: 0,
      })
      .eq('auth_id', uid)

    console.log(`Subscription expired for ${uid} — reverted to explorer`)
    return { plan: 'explorer', status: 'inactive' }
  } catch (err) {
    console.error('Failed to expire subscription:', err)
    return null
  }
}

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
      .select('current_plan, subscription_status, free_ai_credits_used, lite_bonus_credits, lecture_allowance, lectures_used, period_end, plan_locked')
      .eq('auth_id', uid)
      .maybeSingle()

    let currentPlan = data?.current_plan || 'explorer'
    let subscriptionStatus = data?.subscription_status || null
    const periodEnd = data?.period_end || null

    // Auto-expire check
    const expired = await checkAndExpireSubscription(uid, currentPlan, subscriptionStatus, periodEnd)
    if (expired) {
      currentPlan = expired.plan
      subscriptionStatus = expired.status
    }

    return {
      userId: uid,
      currentPlan,
      subscriptionStatus,
      freeCreditsUsed: data?.free_ai_credits_used || 0,
      liteBonusCredits: data?.lite_bonus_credits || 0,
      lectureAllowance: expired ? 0 : (data?.lecture_allowance || 0),
      lecturesUsed: data?.lectures_used || 0,
      periodEnd,
      planLocked: data?.plan_locked || false,
    }
  } catch (err) {
    console.error('Failed to load access info:', err)
    return emptyAccess
  }
}

// ── Plan checks ────────────────────────────────────────────────────────────

export const isActivePaidPlan = (access: AccessInfo) =>
  ['excellence', 'valedictorian'].includes(access.currentPlan || '') &&
  access.subscriptionStatus === 'active'

export const isPremiumPlan = (access: AccessInfo) =>
  access.currentPlan === 'valedictorian' && access.subscriptionStatus === 'active'

// Single definition — used everywhere
export const isUnlimitedPlan = isActivePaidPlan

export const explorerLecturesRemaining = (access: AccessInfo) =>
  Math.max(0, EXPLORER_LIFETIME_LIMIT - (access.freeCreditsUsed || 0))

// Alias for backward compatibility with Recording.tsx and other pages
export const freeCreditsRemaining = explorerLecturesRemaining

export const paidLecturesRemaining = (access: AccessInfo) =>
  Math.max(0, (access.lectureAllowance || 0) - (access.lecturesUsed || 0))

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

// ── Access result ──────────────────────────────────────────────────────────

export type AccessResult =
  | { allowed: true; source: 'paid_subscription' | 'achiever_session' | 'explorer_free' | 'bonus' }
  | { allowed: false; reason: 'explorer_locked' | 'no_lectures_left' | 'needs_premium' }

export const checkAccess = (access: AccessInfo, feature: FeatureType): AccessResult => {
  if (access.planLocked) {
    return { allowed: false, reason: 'explorer_locked' }
  }

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

export const consumeCredit = async (
  access: AccessInfo,
  source: 'paid_subscription' | 'achiever_session' | 'explorer_free' | 'bonus'
): Promise<void> => {
  if (!access.userId) return

  fetch('/api/referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', userId: access.userId }),
  }).catch(() => {})

  try {
    const client = await getSupabase()

    if (source === 'explorer_free') {
      const newUsed = access.freeCreditsUsed + 1
      await client
        .from('users')
        .update({
          free_ai_credits_used: newUsed,
          plan_locked: newUsed >= EXPLORER_LIFETIME_LIMIT,
        })
        .eq('auth_id', access.userId)
    } else if (source === 'bonus') {
      await client
        .from('users')
        .update({ lite_bonus_credits: Math.max(0, access.liteBonusCredits - 1) })
        .eq('auth_id', access.userId)
    } else if (source === 'paid_subscription') {
      await client
        .from('users')
        .update({ lectures_used: access.lecturesUsed + 1 })
        .eq('auth_id', access.userId)
    }
  } catch (err) {
    console.error('Failed to consume credit:', err)
  }
}

export const grantLiteBonusCredit = async (
  userId: string,
  currentBonusCredits: number
): Promise<void> => {
  try {
    const client = await getSupabase()
    await client
      .from('users')
      .update({ lite_bonus_credits: currentBonusCredits + 1 })
      .eq('auth_id', userId)
  } catch (err) {
    console.error('Failed to grant bonus credit:', err)
  }
}
