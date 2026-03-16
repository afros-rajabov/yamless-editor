/* eslint-disable no-undef */
window.onload = function () {
  window["SwaggerUIBundle"] = window["swagger-ui-bundle"]
  window["SwaggerUIStandalonePreset"] = window["swagger-ui-standalone-preset"]
  // Build a system
  const ui = SwaggerUIBundle({
    spec: {
      openapi: "3.1.0",
      info: {
        title: "[MY API}",
        description: "Default Description",
        version: "1.0.0"
      },
      servers: [],
      paths: {},
      components: {
        schemas: {}
      },
      security: [],
      tags: []
    },
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    requestSnippetsEnabled: true,
    layout: "StandaloneLayout"
  })

  window.ui = ui

  ui.initOAuth({
    clientId: "your-client-id",
    clientSecret: "your-client-secret-if-required",
    realm: "your-realms",
    appName: "your-app-name",
    scopeSeparator: " ",
    scopes: "openid profile email phone address",
    additionalQueryStringParams: {},
    useBasicAuthenticationWithAccessCodeGrant: false,
    usePkceWithAuthorizationCodeGrant: false
  })
}
