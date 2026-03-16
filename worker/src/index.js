const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (request.method !== "POST" || url.pathname !== "/api/token") {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS })
    }

    const { code, client_id } = await request.json()

    const ghResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
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
