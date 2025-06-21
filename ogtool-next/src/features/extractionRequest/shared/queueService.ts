
import { Result, toResult } from "@dexyn/common-library/result/resultUtils";
import { amqpClient } from "@/infrastructure/amqpClient";
import { ExtractionRequest } from "./types";

const EXTRACTION_REQUESTS_QUEUE_NAME = process.env.EXTRACTION_REQUESTS_QUEUE_NAME as string;

const createExtractionRequestQueueService = () => {

    const publishExtractionRequest = async (extractionRequest: ExtractionRequest): Promise<Result<void>> => {
        const logPrefix = `[Service - ExtractionRequest] ExtractionRequest ${extractionRequest.id}:`;
        console.log(`${logPrefix} Publishing extraction request.`);
        const content = Buffer.from(JSON.stringify(extractionRequest));
        await amqpClient.sendToQueue(EXTRACTION_REQUESTS_QUEUE_NAME, content, { persistent: true });

        return toResult(undefined);
    }

    return {
        publishExtractionRequest
    }
}

export const getExtractionRequestQueueService = async () => {
    return createExtractionRequestQueueService();
}