from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse

from src.coaching.routes.deliveries import router as deliveries_router

# docs_url=None disables the default (light-only) /docs so we can serve a
# dark-themed Swagger UI at the same path instead.
app = FastAPI(title="CoachLens Coaching API", docs_url=None)
app.include_router(deliveries_router)

_DARK_THEME_LINK = (
    '<link rel="stylesheet" type="text/css" '
    'href="https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.1/themes/3.x/theme-dark.css">'
)


@app.get("/docs", include_in_schema=False)
def swagger_ui_dark() -> HTMLResponse:
    # theme-dark.css only overrides colors — it needs the base swagger-ui.css
    # for layout, so it's appended after get_swagger_ui_html's default
    # stylesheet rather than replacing it via swagger_css_url.
    base_html = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
    ).body.decode()
    return HTMLResponse(base_html.replace("</head>", f"{_DARK_THEME_LINK}</head>"))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
