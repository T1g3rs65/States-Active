"""One-off fresh-start wipe for the wheel system."""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017"))
    db = client[os.environ.get("DB_NAME", "states")]
    n_nations = await db.nations.count_documents({})
    n_issues = await db.issues.count_documents({})
    n_decisions = await db.decisions.count_documents({})
    await db.nations.delete_many({})
    await db.issues.delete_many({})
    await db.decisions.delete_many({})
    print(f"Deleted nations={n_nations} issues={n_issues} decisions={n_decisions}")

if __name__ == "__main__":
    asyncio.run(main())
