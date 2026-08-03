export async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)))
          continue
        }
      }
      return response
    } catch (err) {
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)))
      } else {
        throw err
      }
    }
  }
}
