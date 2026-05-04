type JsonObject = Record<string, unknown>

export class ProviderHttpError extends Error {
  constructor(message: string, readonly status: number, readonly url: string) {
    super(message)
    this.name = 'ProviderHttpError'
  }
}

export type ProviderHttpClientOptions = {
  baseUrl: string
  headers?: HeadersInit
}

export class ProviderHttpClient {
  private readonly baseUrl: string
  private readonly headers: HeadersInit

  constructor(options: ProviderHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.headers = options.headers ?? {}
  }

  async get<T = unknown>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params)
    const response = await fetch(url, { headers: this.headers })

    if (!response.ok) {
      const hint =
        response.status === 401
          ? 'Unauthorized provider request. Check the API token.'
          : `Provider request failed with ${response.status}.`
      throw new ProviderHttpError(hint, response.status, url)
    }

    try {
      return (await response.json()) as T
    } catch (error) {
      throw new Error(`Provider returned invalid JSON for ${url}: ${error}`)
    }
  }

  async getAllPages<T = unknown>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    maxPages = 50
  ): Promise<T[]> {
    const results: T[] = []
    let nextPath: string | null = path
    let page = 1

    while (nextPath && page <= maxPages) {
      const payload: JsonObject = await this.get<JsonObject>(nextPath, {
        ...params,
        page: nextPath === path ? page : undefined,
      })

      const pageResults = Array.isArray(payload.results)
        ? (payload.results as T[])
        : Array.isArray(payload.response)
          ? (payload.response as T[])
          : Array.isArray(payload)
            ? (payload as T[])
            : []

      results.push(...pageResults)

      const next: string | null = typeof payload.next === 'string' ? payload.next : null
      nextPath = next ? stripBasePath(next, this.baseUrl) : null
      page += 1
    }

    if (page > maxPages) {
      throw new Error(`Provider pagination exceeded ${maxPages} pages for ${path}`)
    }

    return results
  }

  private buildUrl(
    path: string,
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const url = path.startsWith('http')
      ? new URL(path)
      : new URL(`${this.baseUrl}/${path.replace(/^\/+/, '')}`)

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    return url.toString()
  }
}

function stripBasePath(url: string, baseUrl: string): string {
  if (!url.startsWith('http')) return url
  const parsed = new URL(url)
  const base = new URL(baseUrl)
  if (parsed.origin !== base.origin) return url
  const basePath = base.pathname.replace(/\/+$/, '')
  const path =
    basePath && parsed.pathname.startsWith(basePath)
      ? parsed.pathname.slice(basePath.length) || '/'
      : parsed.pathname
  return `${path}${parsed.search}`
}
