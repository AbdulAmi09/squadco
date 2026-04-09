from __future__ import annotations

import time

from services.logger import configure_logging, logger
from services.redis_cache import get_redis_client

def main() -> None:
    configure_logging()
    while True:
        client = get_redis_client()
        if client is None:
            logger.warning("worker_idle_no_redis", service="trustlayer-ai-worker")
            time.sleep(30)
            continue

        queue_name = "trustlayer:worker:queue"
        job = client.brpop(queue_name, timeout=15)
        if not job:
            continue

        _, payload = job
        logger.info("worker_job_received", service="trustlayer-ai-worker", queue=queue_name, payload=payload)
        time.sleep(30)


if __name__ == "__main__":
    main()
