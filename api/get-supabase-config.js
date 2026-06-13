export default function handler(req, res) {
  let url = process.env.SUPABASE_URL || ''
  
  // Remove /rest/v1/ if it's there
  url = url.replace('/rest/v1/', '')
  
  return res.status(200).json({
    url: url,
    key: process.env.SUPABASE_ANON_KEY,
  })
}
