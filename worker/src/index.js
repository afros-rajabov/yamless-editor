const ALLOWED_PATHS = ["/login/device/code", "/login/oauth/access_token"]

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (request.method !== "POST" || !ALLOWED_PATHS.includes(url.pathname)) {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS })
    }

    const body = await request.text()
    const ghResponse = await fetch(`https://github.com${url.pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body,
    })

    const responseBody = await ghResponse.text()
    return new Response(responseBody, {
      status: ghResponse.status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    })
  },
}
