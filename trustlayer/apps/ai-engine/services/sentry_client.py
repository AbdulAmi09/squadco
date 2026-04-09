from __future__ import annotations

import os

import sentry_sdk


def configure_sentry() -> None:
    sentry_dsn = os.getenv("SENTRY_DSN", "")
    if not sentry_dsn:
        return

    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=0.1,
        environment=os.getenv("RENDER_SERVICE_NAME", "production"),
    )
