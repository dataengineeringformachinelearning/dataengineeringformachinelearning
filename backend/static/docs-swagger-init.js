/* Swagger UI boot — self-hosted; CSRF via data attributes (no inline script). */
(function () {
  var script = document.currentScript;
  var openapiUrl =
    (script && script.getAttribute("data-openapi-url")) ||
    "/api/v1/openapi.json";
  var csrfToken = (script && script.getAttribute("data-csrf-token")) || "";
  if (typeof SwaggerUIBundle === "undefined") {
    console.error(
      "SwaggerUIBundle missing — check /static/vendor/swagger-ui-dist/",
    );
    return;
  }
  window.ui = SwaggerUIBundle({
    url: openapiUrl,
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis],
    layout: "BaseLayout",
    deepLinking: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 0,
    tryItOutEnabled: true,
    persistAuthorization: false,
    requestInterceptor: function (req) {
      if (csrfToken) {
        req.headers["X-CSRFToken"] = csrfToken;
      }
      return req;
    },
  });
})();
