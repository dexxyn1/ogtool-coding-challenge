# OGTool Next.js Application

A Next.js application for web content extraction and processing using OpenAI and RabbitMQ.

## Prerequisites

Before setting up this project, you'll need:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database
3. **Python** (v3.8 or higher) - for the core worker service
4. **OpenAI API Key** - Get one at [https://platform.openai.com/](https://platform.openai.com/)
5. **CloudAMQP Account** - Sign up at [https://customer.cloudamqp.com/login](https://customer.cloudamqp.com/login) (free plans available)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to the project directory
cd ogtool-next

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_CONNECTION_STRING_OG_TOOL=postgresql://username:password@localhost:5432/ogtool_db

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# CloudAMQP Configuration
CLOUDAMQP_URL=amqps://username:password@hostname:port/vhost
EXTRACTION_REQUESTS_QUEUE_NAME=extraction_requests

# Session Configuration
USER_SESSION_PASSWORD=your_session_secret_key_here - must be 32 characters
USER_SESSION_COOKIE_NAME=ogtool_session
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) View your database with Prisma Studio
npx prisma studio
```

### 4. Core Worker Setup

The application includes a Python FastAPI worker service that processes extraction requests. See the [Core Worker README](../core/worker/README.md) for detailed setup instructions.

### 5. Development

```bash
# Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure
