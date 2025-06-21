# Core Worker (FastAPI)

This service is a worker process built with Python and FastAPI. It consumes messages from a RabbitMQ queue, processes them, and calls an external API.

## Setup

1.  **Create a virtual environment:**

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```

2.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the `core/worker` directory by copying the example file:

    ```bash
    cp .env.example .env
    ```

    Now, edit the `.env` file with your specific configuration:

    ```
    # Database Configuration
    DATABASE_CONNECTION_STRING_OG_TOOL=postgresql://username:password@localhost:5432/ogtool_db

    # OpenAI Configuration
    OPENAI_API_KEY=your_openai_api_key_here

    # CloudAMQP Configuration
    CLOUDAMQP_URL=amqps://username:password@hostname:port/vhost
    EXTRACTION_REQUESTS_QUEUE_NAME=extraction_requests
    ```

## Running the Service

To run the worker and the FastAPI server for development, use `uvicorn`:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag will automatically restart the server when you make changes to the code.

## Health Check

The service provides a health check endpoint to monitor its status and the connection to RabbitMQ.

-   **URL:** `/health`
-   **Success Response (200 OK):** `Healthy`
-   **Error Response (503 Service Unavailable):** `AMQP not connected` 