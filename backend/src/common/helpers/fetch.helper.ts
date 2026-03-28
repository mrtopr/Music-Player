import { userAgents, type Endpoints } from '#common/constants'
import type { ApiContextEnum } from '#common/enums'

type EndpointValue = (typeof Endpoints)[keyof typeof Endpoints]

interface FetchParams {
  endpoint: EndpointValue
  params: Record<string, string | number>
  context?: ApiContextEnum
}

interface FetchResponse<T> {
  data: T
  ok: Response['ok']
}

export const useFetch = async <T>({ endpoint, params, context }: FetchParams): Promise<FetchResponse<T>> => {
  const url = new URL('https://www.jiosaavn.com/api.php')

  url.searchParams.append('__call', endpoint.toString())
  url.searchParams.append('_format', 'json')
  url.searchParams.append('_marker', '0')
  url.searchParams.append('api_version', '4')
  url.searchParams.append('ctx', context || 'web6dot0')

  Object.keys(params).forEach((key) => url.searchParams.append(key, String(params[key])))

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)]

  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', 'User-Agent': randomUserAgent }
  })

  let rawData = await response.text()
  
  // Clean up any garbage before first brace
  if (rawData.includes('{')) {
      rawData = rawData.substring(rawData.indexOf('{'))
  }
  
  // Clean up typical JioSaavn JSON errors:
  // Sometimes HTML or unescaped characters leak into the JSON
  let data
  try {
    data = JSON.parse(rawData)
  } catch (err: any) {
    console.warn('JSON Parse error encountered. Attempting basic cleanup...', err.message)
    try {
        // Attempt to fix common issues (e.g., unescaped quotes matching text)
        // or just strip out the offending parts if it's minor... 
        // For JioSaavn, typically there's just tailing garbage:
        if (rawData.lastIndexOf('}') !== -1) {
            const truncated = rawData.substring(0, rawData.lastIndexOf('}') + 1)
            data = JSON.parse(truncated)
        } else {
            throw err
        }
    } catch (rescueErr: any) {
        console.error('JSON recovery failed, returning fallback empty object', rescueErr.message)
        // Return a mock object to prevent breaking the flow so images/titles have a fallback
        data = { success: false, data: {} }
    }
  }

  return { data: data as T, ok: response.ok }
}
