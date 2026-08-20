"""DEPRECATED (GH-78): standalone Zythera-Queen portrait generator.

This script previously used the `emergentintegrations` provider
(`OpenAIImageGeneration`) to regenerate the Zythera Queen portrait. That
provider is no longer supported or installed — image generation now routes
through the OpenClaw gateway (see `grok_client.py` / `portrait_service.py`).

Kept only as historical reference. Running it fails fast with a clear message.
"""

import asyncio
import sys

_DEPRECATION_MSG = (
    "DEPRECATED: this standalone portrait generator used the removed "
    "`emergentintegrations` provider. Image generation now routes through "
    "the OpenClaw gateway (see grok_client.py / portrait_service.py). "
    "Nothing to run."
)


async def main() -> None:
    print(_DEPRECATION_MSG, file=sys.stderr)
    return


if __name__ == "__main__":
    asyncio.run(main())
