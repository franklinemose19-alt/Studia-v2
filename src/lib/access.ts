import { getSupabase } from './supabaseClient'

export type FeatureType = 'core' | 'premium'

export interface AccessInfo {
  userId: string | null
  currentPlan: string | null
  subscriptionStatus: string | null
  freeCreditsUsed: number
  liteBonusCredits: number
}

const FREE_CREDIT_LIMIT = 3

export const emptyAccess: AccessInfo = {
  userId: null,
  currentPlan: null,
  subscriptionStatus: null,
  freeCreditsUsed: 0,
  liteBonusCredits: 0,
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
  .select('current_plan, subscription_status, free_ai_credits_used, lite_bonus_credits')
  .eq('auth_id', uid)
  .maybeSingle()

    return {
      userId: uid,
      currentPlan: data?.current_plan || null,
      subscriptionStatus: data?.subscription_status || null,
      freeCreditsUsed: data?.free_ai_credits_used || 0,
      liteBonusCredits: data?.lite_bonus_credits || 0,
    }
  } catch (err) {
    console.error('Failed to load access info:', err)
    return emptyAccess
  }
}

export const isUnlimitedPlan = (access: AccessInfo) =>
  ['pro', 'semester'].includes(access.currentPlan || '')

export const isPremiumPlan = (access: AccessInfo) =>
  ['pro', 'semester'].includes(access.currentPlan || '') && access.subscriptionStatus === 'active'

export const freeCreditsRemaining = (access: AccessInfo) =>
  Math.max(0, FREE_CREDIT_LIMIT - access.freeCreditsUsed)

export type AccessResult =
  | { allowed: true; source: 'unlimited' | 'free' | 'lite' }
  | { allowed: false; reason: 'no_credits' | 'needs_pro' }

export const checkAccess = (access: AccessInfo, feature: FeatureType): AccessResult => {
  if (isUnlimitedPlan(access)) {
    if (feature === 'premium' && !isPremiumPlan(access)) {
      if (freeCreditsRemaining(access) > 0) return { allowed: true, source: 'free' }
      if (access.liteBonusCredits > 0) return { allowed: true, source: 'lite' }
      return { allowed: false, reason: 'needs_pro' }
    }
    return { allowed: true, source: 'unlimited' }
  }

  if (freeCreditsRemaining(access) > 0) return { allowed: true, source: 'free' }
  if (access.liteBonusCredits > 0) return { allowed: true, source: 'lite' }
  return { allowed: false, reason: 'no_credits' }
}

export const consumeCredit = async (access: AccessInfo, source: 'free' | 'lite' | 'unlimited'): Promise<void> => {
  if (!access.userId || source === 'unlimited') return
  try {
    const client = await getSupabase()
    if (source === 'free') {
      await client.from('users').update({ free_ai_credits_used: access.freeCreditsUsed + 1 }).eq('auth_id', access.userId)
    } else if (source === 'lite') {
      await client.from('users').update({ lite_bonus_credits: Math.max(0, access.liteBonusCredits - 1) }).eq('auth_id', access.userId)
    }
  } catch (err) {
    console.error('Failed to consume credit:', err)
  }
}

export const grantLiteBonusCredit = async (userId: string, currentLiteBonusCredits: number): Promise<void> => {
  try {
    const client = await getSupabase()
    await client.from('users').update({ lite_bonus_credits: currentLiteBonusCredits + 1 }).eq('auth_id', userId)
  } catch (err) {
    console.error('Failed to grant lite bonus credit:', err)
  }
}
