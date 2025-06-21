import asyncio
import json
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from typing import Generic, Optional, TypeVar
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import aio_pika
import httpx
from database import DatabaseService
from fastapi import FastAPI, Response, status
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from chunk_kb_item import chunk_kb_item

# Add project root to path to allow sibling imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from core.scraper.ai_bs_scraper import AiScraper, KBItem
from core.scraper.gdrive_scraper import extract_gdrive_folder

# --- Configuration ---
class Settings(BaseSettings):
    """
    Configuration settings for the application, loaded from environment variables.
    """
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    port: int = Field(default=8000, alias="PORT")
    api_base_url: str = Field(
        default="http://localhost:3000/api/", alias="API_BASE_URL"
    )
    cloudamqp_url: str = Field(..., alias="CLOUDAMQP_URL")
    database_connection_string: str = Field(
        ..., alias="DATABASE_CONNECTION_STRING_OG_TOOL"
    )
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    extraction_requests_queue_name: str = Field(
        default="EXTRACTION_REQUESTS_QUEUE", alias="EXTRACTION_REQUESTS_QUEUE_NAME"
    )

settings = Settings()
os.environ["OPENAI_API_KEY"] = settings.openai_api_key

db_service = DatabaseService(db_url=settings.database_connection_string)

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# --- Pydantic Models ---
class JobPayload(BaseModel):
    """
    Defines the structure of the job payload for an extraction request.
    """
    id: str
    url: str
    specialInstructions: str



class ProcessRequestOutput(BaseModel):
    """
    Defines the expected output from the API after processing the request.
    """
    resultCount: int


T = TypeVar("T")


class Result(BaseModel, Generic[T]):
    """
    A generic result wrapper for API responses.
    """
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None


def run_scraper_and_get_results(url: str, instructions: str):
    """
    Initializes, runs, and closes the synchronous AiScraper.
    This function is designed to be run in a thread pool executor.
    """
    scraper = None
    try:
        scraper = AiScraper(
            start_url=url,
            special_instructions=instructions,
        )
        kb_items = scraper.run()
        return kb_items
    except Exception as e:
        logger.error(f"An error occurred during scraping: {e}", exc_info=True)
        return []
    finally:
        if scraper:
            scraper.close()


# --- Extraction Worker ---
class ExtractionWorker:
    """
    Handles the connection to RabbitMQ and processing of messages.
    """
    def __init__(self, amqp_url: str, queue_name: str):
        self._amqp_url = amqp_url
        self.connection: Optional[aio_pika.abc.AbstractRobustConnection] = None
        self.channel: Optional[aio_pika.abc.AbstractChannel] = None
        self.queue_name = queue_name

    @property
    def is_connected(self) -> bool:
        return self.connection and not self.connection.is_closed
    
    async def process_message(self, payload: JobPayload):
        # The scraper is synchronous, so run it in a thread pool
        loop = asyncio.get_running_loop()
        kb_items = await loop.run_in_executor(
                    None,
                    run_scraper_and_get_results,
                    payload.url,
                    payload.specialInstructions
                )
        return kb_items
    
    async def process_gdrive_message(self, payload: JobPayload):
        logger.info(f"Processing Google Drive URL: {payload.url}")
        loop = asyncio.get_running_loop()
        
        # Run the synchronous gdrive scraper in a thread pool
        docs = await loop.run_in_executor(
            None, 
            extract_gdrive_folder, 
            payload.url
        )

        if not docs:
            logger.info(f"Google Drive scraper found no documents in {payload.url}")
            return []
            
        kb_items = [
            KBItem(
                title=doc.path,
                content=doc.text,
                content_type=doc.mime or "book",
                source_url=payload.url,
                author=doc.author or "Unknown",
            )
            for doc in docs
        ]

        # Chunk the items after they have been created
        chunked_kb_items = []
        for item in kb_items:
            chunked_kb_items.extend(chunk_kb_item(item))
        
        logger.info(f"Extracted and chunked {len(chunked_kb_items)} documents from Google Drive.")
        return chunked_kb_items
    
    async def _process_message(self, message: aio_pika.abc.AbstractIncomingMessage):
        async with message.process():
            try:
                print("received message ", message.body)
                
                # Manually parse JSON to get IDs before Pydantic validation
                message_data = json.loads(message.body)
                payload = JobPayload.model_validate(message_data)
                
                extraction_request_id = payload.id

                logger.info(f"Processing job for extraction request {extraction_request_id}")

                kb_items = []
                if "drive.google.com" in payload.url:
                    kb_items = await self.process_gdrive_message(payload)
                else:
                    kb_items = await self.process_message(payload)

                if not kb_items:
                    logger.info(f"Scraper found no items for {payload.url}")
                    await db_service.complete_extraction_request(extraction_request_id)
                    return

                results_to_save = [
                    {
                        "id": str(uuid.uuid4()),
                        "extractionRequestId": extraction_request_id,
                        "title": item.title,
                        "content": item.content,
                        "contentType": item.content_type,
                        "sourceUrl": item.source_url,
                        "author": item.author or "",
                    }
                    for item in kb_items
                ]

                await db_service.save_extraction_results(results_to_save)
                logger.info(
                    "Successfully processed and saved results for extraction request "
                    f"{extraction_request_id}"
                )
                await db_service.complete_extraction_request(extraction_request_id)

            except Exception as e:
                logger.error(
                    f"[Extraction Worker] Error processing message: {e}", exc_info=True
                )

    async def start(self):
        """
        Connects to RabbitMQ and starts consuming messages from the queue.
        Includes retry logic for the initial connection.
        """
        while True:
            try:
                logger.info("[AMQP] Connecting to RabbitMQ...")
                self.connection = await aio_pika.connect_robust(self._amqp_url)

                self.channel = await self.connection.channel()
                await self.channel.set_qos(prefetch_count=1)

                queue = await self.channel.declare_queue(
                    self.queue_name, durable=True
                )

                logger.info(f"[Extraction Worker] Waiting for messages on {self.queue_name}...")
                await queue.consume(self._process_message)
                break  # Exit loop on successful connection and consumption start
            except aio_pika.exceptions.AMQPConnectionError as e:
                logger.error(f"[AMQP] Connection failed: {e}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"An unexpected error occurred during worker startup: {e}", exc_info=True)
                await asyncio.sleep(5)

    async def stop(self):
        """
        Gracefully stops the worker and closes the AMQP connection.
        """
        if self.channel and not self.channel.is_closed:
            await self.channel.close()
            logger.info("[AMQP] Channel closed.")
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("[AMQP] Connection closed.")


worker = ExtractionWorker(
    amqp_url=settings.cloudamqp_url, 
    queue_name=settings.extraction_requests_queue_name
)


# --- FastAPI Application ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the FastAPI application.
    """
    logger.info("[FastAPI] Starting application...")
    # Run the worker in the background
    worker_task = asyncio.create_task(worker.start())
    yield
    logger.info("[FastAPI] Shutting down application...")
    await worker.stop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        logger.info("[FastAPI] Worker task cancelled.")


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health_check():
    """
    Health endpoint: returns 200 if AMQP channel is open, 503 otherwise.
    """
    if worker.is_connected:
        return Response(content="Healthy", status_code=status.HTTP_200_OK)
    else:
        return Response(
            content="AMQP not connected",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port) 