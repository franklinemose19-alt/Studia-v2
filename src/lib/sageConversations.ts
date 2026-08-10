import { getSupabase } from './supabaseClient'

export interface SageConversation {
  id: number
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SageMessageRow {
  id: number
  conversation_id: number
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: any
  created_at: string
}

export function generateTitle(text: string, hasAttachment?: boolean): string {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ')
  if (!cleaned) return hasAttachment ? 'Photo question' : 'New chat'
  const words = cleaned.split(' ').slice(0, 8).join(' ')
  return words.length > 48 ? words.slice(0, 48) + '…' : words
}

export async function listConversations(userId: string): Promise<SageConversation[]> {
  const client = await getSupabase()
  const { data, error } = await client
    .from('sage_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) { console.error('listConversations failed:', error); return [] }
  return data || []
}

export async function createConversation(userId: string, title: string): Promise<SageConversation | null> {
  const client = await getSupabase()
  const { data, error } = await client
    .from('sage_conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()
  if (error) { console.error('createConversation failed:', error); return null }
  return data
}

export async function renameConversation(id: number, title: string): Promise<boolean> {
  const client = await getSupabase()
  const { error } = await client
    .from('sage_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { console.error('renameConversation failed:', error); return false }
  return true
}

export async function deleteConversation(id: number): Promise<boolean> {
  const client = await getSupabase()
  const { error } = await client.from('sage_conversations').delete().eq('id', id)
  if (error) { console.error('deleteConversation failed:', error); return false }
  return true
}

async function touchConversation(id: number): Promise<void> {
  const client = await getSupabase()
  await client.from('sage_conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)
}

export async function loadMessages(conversationId: number): Promise<SageMessageRow[]> {
  const client = await getSupabase()
  const { data, error } = await client
    .from('sage_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) { console.error('loadMessages failed:', error); return [] }
  return data || []
}

export async function saveMessage(
  conversationId: number,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: any = {}
): Promise<SageMessageRow | null> {
  const client = await getSupabase()
  const { data, error } = await client
    .from('sage_messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, content, metadata })
    .select()
    .single()
  if (error) { console.error('saveMessage failed:', error); return null }
  touchConversation(conversationId).catch(() => {})
  return data
}
