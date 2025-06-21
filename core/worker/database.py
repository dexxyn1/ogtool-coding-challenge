import asyncio
import logging
import os
import uuid
from datetime import datetime
from typing import List
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import Boolean, Column, DateTime, String, Text, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

logger = logging.getLogger(__name__)

Base = declarative_base()


class ExtractionResult(Base):
    """
    SQLAlchemy model for the ExtractionResult table.
    """
    __tablename__ = "ExtractionResult"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    extractionRequestId = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    contentType = Column(String, nullable=False)
    sourceUrl = Column(String, nullable=False)
    author = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now(), default=datetime.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now(), default=datetime.now())


class ExtractionRequest(Base):
    __tablename__ = "ExtractionRequest"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userSessionId = Column(String, nullable=False)
    url = Column(String, nullable=False)
    specialInstructions = Column(String, nullable=False)
    isCompleted = Column(Boolean, default=False)
    createdAt = Column(DateTime, server_default=func.now(), default=datetime.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now(), default=datetime.now())


class DatabaseService:
    """
    Handles asynchronous database operations.
    """
    def __init__(self, db_url: str):
        parsed_url = urlparse(db_url)
        query_params = parse_qs(parsed_url.query)
        schema = query_params.pop("schema", [None])[0]

        cleaned_db_url = urlunparse(
            (
                parsed_url.scheme.replace("postgresql", "postgresql+asyncpg"),
                parsed_url.netloc,
                parsed_url.path,
                parsed_url.params,
                urlencode(query_params, doseq=True),
                parsed_url.fragment,
            )
        )

        engine_args = {}
        if schema:
            engine_args["execution_options"] = {"schema_translate_map": {None: schema}}

        self.engine = create_async_engine(cleaned_db_url, **engine_args)
        self.async_session_factory = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def save_extraction_results(self, results: List[dict]):
        """
        Saves a list of extraction results to the database.
        """
        if not results:
            return

        async with self.async_session_factory() as session:
            async with session.begin():
                session.add_all([ExtractionResult(**result) for result in results])
                logger.info(f"Preparing to save {len(results)} extraction results.")
            await session.commit()
            logger.info("Successfully saved extraction results to the database.")

    async def complete_extraction_request(self, extraction_request_id: str):
        async with self.async_session_factory() as session:
            async with session.begin():
                # Build an UPDATE statement
                stmt = (
                    update(ExtractionRequest)
                    .where(ExtractionRequest.id == extraction_request_id)
                    .values(isCompleted=True)
                )

                # Execute it
                await session.execute(stmt)
async def main():
    """
    Main function to test database insertion.
    """
    load_dotenv()
    db_url = os.getenv("DATABASE_CONNECTION_STRING_OG_TOOL")
    if not db_url:
        print("Error: DATABASE_CONNECTION_STRING_OG_TOOL environment variable not set.")
        return

    db_service = DatabaseService(db_url)

    # Create a sample result to insert
    sample_result = [
        {
            "extractionRequestId": "f9790eca-6f1d-4f80-82e9-a97d7a040e0b",
            "title": "Test Title",
            "content": "This is the content of the test extraction.",
            "contentType": "blog",
            "sourceUrl": "http://example.com/test",
            "author": "Test Author"
        }
    ]

    print("Attempting to save one sample result to the database...")
    print(ExtractionResult(**sample_result[0]))
    await db_service.save_extraction_results(sample_result)
    await db_service.complete_extraction_request("f9790eca-6f1d-4f80-82e9-a97d7a040e0b")
    print("✅ Test finished.")


if __name__ == "__main__":
    # To run this script directly for testing:
    # 1. Make sure you have a .env file in the `core/worker` directory
    #    with the DATABASE_CONNECTION_STRING_OG_TOOL variable set.
    # 2. Run `python -m core.worker.database` from the root `OGTool` directory.
    asyncio.run(main()) 