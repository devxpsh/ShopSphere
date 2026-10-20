import { Request, Response, Router } from 'express';
import { openApiSpec } from './openapi';

const router = Router();

/**
 * GET /api/v1/docs.json (or /api/v1/docs/openapi.json)
 * Returns the machine-readable OpenAPI 3.0.3 specification JSON.
 */
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiSpec);
});

/**
 * GET /api/v1/docs
 * Serves interactive Swagger UI backed by /api/v1/docs/openapi.json.
 */
router.get('/', (_req: Request, res: Response) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:;"
  );

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopSphere API Documentation (OpenAPI 3.0)</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .shopsphere-banner {
        background: #0f172a;
        color: #f8fafc;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px solid #4f46e5;
      }
      .shopsphere-banner h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
      }
      .shopsphere-banner a {
        color: #a5b4fc;
        font-size: 13px;
        text-decoration: none;
        font-family: monospace;
      }
    </style>
  </head>
  <body>
    <header class="shopsphere-banner">
      <h1>ShopSphere E-Commerce API — OpenAPI 3.0.3 Reference</h1>
      <a href="/api/v1/docs/openapi.json" target="_blank" rel="noreferrer">
        Raw Spec: /api/v1/docs/openapi.json
      </a>
    </header>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        if (window.SwaggerUIBundle) {
          window.SwaggerUIBundle({
            url: '/api/v1/docs/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            persistAuthorization: true,
          });
        }
      };
    </script>
  </body>
</html>`;

  res.status(200).type('html').send(html);
});

export const docsRouter = router;
