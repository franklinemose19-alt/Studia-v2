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

// ── Plan checks ────────────────────────────────────────────────────────────

export const isActivePaidPlan = (access: AccessInfo) =>
  ['excellence', 'valedictorian'].includes(access.currentPlan || '') &&
  access.subscriptionStatus === 'active'

export const isPremiumPlan = (access: AccessInfo) =>
  access.currentPlan === 'valedictorian' && access.subscriptionStatus === 'active'

export const isUnlimitedPlan = (access: AccessInfo) => isActivePaidPlan(access)

export const explorerLecturesRemaining = (access: AccessInfo) =>
  Math.max(0, EXPLORER_LIFETIME_LIMIT - (access.freeCreditsUsed || 0))

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
  // Explorer permanently locked
  if (access.planLocked) {
    return { allowed: false, reason: 'explorer_locked' }
  }

  // Active paid subscription (Excellence or Valedictorian)
  if (isActivePaidPlan(access)) {
    // Premium features need Valedictorian
    if (feature === 'premium' && !isPremiumPlan(access)) {
      // Excellence users can use bonus credits for premium
      if (access.liteBonusCredits > 0) return { allowed: true, source: 'bonus' }
      if (explorerLecturesRemaining(access) > 0) return { allowed: true, source: 'explorer_free' }
      return { allowed: false, reason: 'needs_premium' }
    }
    // Check lecture allowance
    if (paidLecturesRemaining(access) > 0) return { allowed: true, source: 'paid_subscription' }
    return { allowed: false, reason: 'no_lectures_left' }
  }

  // Achiever bonus credits from paid sessions
  if (access.liteBonusCredits > 0) return { allowed: true, source: 'bonus' }

  // Explorer free lectures (lifetime, not resettable)
  if (explorerLecturesRemaining(access) > 0) return { allowed: true, source: 'explorer_free' }

  // Locked out
  return { allowed: false, reason: 'explorer_locked' }
}

export const consumeCredit = async (
  access: AccessInfo,
  source: 'paid_subscription' | 'achiever_session' | 'explorer_free' | 'bonus'
): Promise<void> => {
  if (!access.userId) return

  // Fire referral verify on first action
  fetch('/api/referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', userId: access.userId }),
  }).catch(() => {})

  try {
    const client = await getSupabase()

    if (source === 'explorer_free') {
      await client
        .from('users')
        .update({
          free_ai_credits_used: access.freeCreditsUsed + 1,
          plan_locked: access.freeCreditsUsed + 1 >= EXPLORER_LIFETIME_LIMIT,
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
    // achiever_session doesn't consume a stored credit — it's per-session paid
  } catch (err) {
    console.error('Failed to consume credit:', err)
  }
}

export const grantLiteBonusCredit = async (userId: string, currentBonusCredits: number): Promise<void> => {
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
