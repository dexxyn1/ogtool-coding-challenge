import * as amqp from "amqplib";
import { Channel, ConsumeMessage, Options, ChannelModel } from "amqplib";

/**
 * Payload for AI jobs: user message and session identifier
 */
export interface JobPayload {
  message: string;
  sessionId: string;
  instanceName: string;
}

/**
 * Creates a shared AMQP client for publishing and consuming messages.
 */
const createAmqpClient = (cloudAmqpUrl: string) => {
  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;
  const logPrefix = "[AMQP Client]"; // Define a consistent prefix

  /**
   * Establishes or reuses a connection and channel.
   */
  const startConnection = async (): Promise<Channel> => {
    if (!connection) {
      console.debug(`${logPrefix} No existing connection found. Attempting to connect...`);
      try {
        const newConnection = await amqp.connect(`${cloudAmqpUrl}?heartbeat=60`);
        console.debug(`${logPrefix} Connection established successfully.`);
        newConnection.on("error", (err: Error) => {
          console.error(`${logPrefix} Connection error`, err);
          connection = null; // Reset on error
        });
        newConnection.on("close", () => {
          console.warn(`${logPrefix} Connection closed.`);
          connection = null; // Reset on close
          channel = null; // Channel is implicitly closed too
        });
        connection = newConnection;
      } catch (err) {
        console.error(`${logPrefix} Failed to establish connection:`, err);
        throw err; // Re-throw error after logging
      }
    } else {
        // console.debug(`${logPrefix} Reusing existing connection.`); // Optional: Can be noisy
    }

    if (!channel) {
      console.debug(`${logPrefix} No existing channel found. Creating channel...`);
      try {
        // connection should exist if we reached here or error was thrown
        const newChannel = await connection!.createChannel();
        console.debug(`${logPrefix} Channel created successfully.`);
        newChannel.on("error", (err: Error) => {
          console.error(`${logPrefix} Channel error`, err);
          channel = null; // Reset on error
        });
        newChannel.on("close", () => {
          console.warn(`${logPrefix} Channel closed.`);
          channel = null; // Reset on close
        });
        channel = newChannel;
      } catch (err) {
         console.error(`${logPrefix} Failed to create channel:`, err);
         // If channel fails, maybe try closing connection? Or just throw.
         if (connection) {
            await connection.close().catch(closeErr => console.error(`${logPrefix} Error closing connection after channel failure:`, closeErr));
            connection = null;
         }
         throw err; // Re-throw error
      }
    } else {
         // console.debug(`${logPrefix} Reusing existing channel.`); // Optional: Can be noisy
    }
    return channel!; // Should be non-null if no error thrown
  };

  /**
   * Consumes messages from a durable queue, one at a time.
   */
  const consume = async <T>(
    queue: string,
    onMessage: (data: T) => Promise<void>
  ): Promise<void> => {
    try {
        const ch = await startConnection();
        await ch.assertQueue(queue, { durable: true });
        console.debug(`${logPrefix} Asserted queue: ${queue}`);
        ch.prefetch(1); // Process one message at a time
        console.debug(`${logPrefix} Set prefetch(1) for queue: ${queue}`);

        const { consumerTag } = await ch.consume(
          queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg) {
              console.warn(`${logPrefix} Received null message on queue ${queue}. Consumer might have been cancelled.`);
              return;
            }
            console.debug(`${logPrefix} Received message from queue=${queue}, deliveryTag=${msg.fields.deliveryTag}`);
            try {
              const data = JSON.parse(msg.content.toString()) as T;
              await onMessage(data);
              console.debug(`${logPrefix} Successfully processed message from queue=${queue}, deliveryTag=${msg.fields.deliveryTag}`);
            } catch (err) {
              console.error(`${logPrefix} Error processing message from ${queue}, deliveryTag=${msg.fields.deliveryTag}`, err);
              // Decide if you want to nack the message here
            } finally {
              try {
                 ch.ack(msg);
                 console.debug(`${logPrefix} Acknowledged message from queue=${queue}, deliveryTag=${msg.fields.deliveryTag}`);
              } catch (ackErr) {
                 console.error(`${logPrefix} Error acknowledging message from ${queue}, deliveryTag=${msg.fields.deliveryTag}`, ackErr);
                 // This is serious, the message might be redelivered
              }
            }
          },
          { noAck: false } // Ensure manual acknowledgment
        );
        console.debug(`${logPrefix} Started consuming queue=${queue} with consumerTag=${consumerTag}`);
    } catch (err) {
        console.error(`${logPrefix} Error setting up consumer for queue ${queue}:`, err);
        // Consider if connection/channel should be closed here
        throw err; // Propagate error
    }
  };

  /**
   * Sends a message to a durable queue.
   */
  const sendToQueue = async (
    queue: string,
    content: Buffer,
    options?: Options.Publish
  ): Promise<void> => {
    try {
      const ch = await startConnection();
      await ch.assertQueue(queue, { durable: true }); // Ensure queue exists
      // Use Buffer.byteLength for accurate size
      console.debug(`${logPrefix} Sending message (${Buffer.byteLength(content)} bytes) to queue=${queue}`); 
      ch.sendToQueue(queue, content, options);
      // Note: sendToQueue is fire-and-forget in basic amqplib, confirmation requires ConfirmChannel
    } catch (err) {
        console.error(`${logPrefix} Error sending message to queue ${queue}:`, err);
        throw err;
    }
  };

  /**
   * Publishes a message to a direct exchange with a routing key.
   */
  const publish = async (
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: Options.Publish
  ): Promise<void> => {
    try {
      const ch = await startConnection();
      // Assert exchange - durable: false implies transient exchange
      await ch.assertExchange(exchange, "direct", { durable: false }); 
      // Use Buffer.byteLength for accurate size
      console.debug(`${logPrefix} Publishing message (${Buffer.byteLength(content)} bytes) to exchange=${exchange}, routingKey=${routingKey || '[default]'}`);
      ch.publish(exchange, routingKey, content, options);
      console.debug(`${logPrefix} Published message to exchange=${exchange}, routingKey=${routingKey || '[default]'}`);
      // Note: publish is fire-and-forget, confirmation requires ConfirmChannel
     } catch (err) {
        console.error(`${logPrefix} Error publishing message to exchange ${exchange}:`, err);
        throw err;
     }
  };

  /**
   * Subscribes to messages from a direct exchange based on a routing key.
   * Creates an exclusive, auto-deleting queue for the subscription.
   * Calls the provided onMessage callback for each received message.
   *
   * @param exchange The direct exchange name.
   * @param routingKey The routing key to bind the queue with.
   * @param onMessage A callback function to handle incoming messages.
   *                  It receives the raw message and the channel for acknowledgment.
   * @returns Promise<{ cancel: () => Promise<void> }> An object with a function to cancel the subscription.
   */
  const subscribeToTopic = async (
    exchange: string,
    routingKey: string,
    onMessage: (msg: ConsumeMessage, ch: Channel) => Promise<void> | void
  ): Promise<{ 
    cancel: () => Promise<void>;
  }> => {
    const ch = await startConnection(); // Ensure connection/channel ready
    console.debug(`${logPrefix} subscribeToTopic: Setting up for exchange=${exchange}, routingKey=${routingKey}`);
    await ch.assertExchange(exchange, "direct", { durable: false });
    // Exclusive=true (only this connection), autoDelete=true (delete when connection closes)
    const { queue } = await ch.assertQueue("", { exclusive: true, autoDelete: true }); 
    console.debug(`${logPrefix} subscribeToTopic: Created exclusive queue=${queue}`);
    await ch.bindQueue(queue, exchange, routingKey);
    console.debug(`${logPrefix} subscribeToTopic: Bound queue=${queue} to exchange=${exchange} with key=${routingKey}`);

    let consumerTag: string | null = null; // Store consumerTag for cancellation

    try {
        const consumeResult = await ch.consume(
          queue,
          async (msg: ConsumeMessage | null) => {
            if (msg) {
              console.debug(`${logPrefix} subscribeToTopic: Received message for key=${routingKey}, deliveryTag=${msg.fields.deliveryTag}`);
              try {
                // Call the user-provided handler
                await onMessage(msg, ch); 
              } catch (handlerError) {
                console.error(`${logPrefix} subscribeToTopic: Error in provided onMessage handler for key=${routingKey}, deliveryTag=${msg.fields.deliveryTag}`, handlerError);
                // Decide if message should be acked or nacked based on handler error
                // For safety, let's ack to prevent potential requeue loops if the handler is broken
                try { ch.ack(msg); } catch (ackErr) { console.error(`${logPrefix} Error acking message after handler error:`, ackErr); }
              }
            } else {
              console.warn(`${logPrefix} subscribeToTopic: Received null message for key=${routingKey}. Consumer cancelled?`);
              // Callback doesn't need to be called, consumer is likely stopping.
            }
          },
          { noAck: false } // Manual acknowledgment
        );
        consumerTag = consumeResult.consumerTag;
        console.debug(`${logPrefix} subscribeToTopic: Started consuming queue=${queue} with consumerTag=${consumerTag}`);
    } catch (consumeErr) {
        console.error(`${logPrefix} subscribeToTopic: Failed to start consumer for queue=${queue}:`, consumeErr);
        throw consumeErr; // Propagate
    }

    const cancel = async () => {
      console.debug(`${logPrefix} subscribeToTopic: Cancel called for key=${routingKey}, consumerTag=${consumerTag ?? 'N/A'}`);
      if (consumerTag && channel) { // Check channel still exists
         try {
            await channel.cancel(consumerTag);
            console.debug(`${logPrefix} subscribeToTopic: Cancelled consumer ${consumerTag}`);
         } catch (cancelErr) {
              // Log error, but continue cleanup
              console.error(`${logPrefix} subscribeToTopic: Error cancelling consumer ${consumerTag}:`, cancelErr);
         }
      } else {
         console.warn(`${logPrefix} subscribeToTopic: Cancel called but no active consumerTag or channel found.`);
      }
      // Note: Queue auto-deletes when channel/connection closes.
    };

    return { cancel };
  };

  /**
   * Closes channel and connection.
   */
  const close = async (): Promise<void> => {
    if (channel) {
      try {
        await channel.close();
        console.debug(`${logPrefix} Channel closed successfully via close().`);
        channel = null;
      } catch (err) {
         console.error(`${logPrefix} Error closing channel via close():`, err);
         // Force null even if close fails?
         channel = null;
      }
    } else {
       // console.debug(`${logPrefix} close() called but channel was already null.`);
    }
    if (connection) {
       try {
          await connection.close();
          console.debug(`${logPrefix} Connection closed successfully via close().`);
          connection = null;
       } catch (err) {
          console.error(`${logPrefix} Error closing connection via close():`, err);
          // Force null even if close fails?
          connection = null;
       }
    } else {
        // console.debug(`${logPrefix} close() called but connection was already null.`);
    }
  };

  // Added listener for process exit signals to attempt graceful shutdown
  const gracefulShutdown = async (signal: string) => {
     console.debug(`${logPrefix} Received signal ${signal}. Closing AMQP connection...`);
     await close();
     process.exit(0); // Exit after cleanup
  };
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return { consume, sendToQueue, publish, subscribeToTopic, close };
};

/**
 * Export a singleton AMQP client instance.
 */
export const amqpClient = createAmqpClient(
  process.env.CLOUDAMQP_URL!
);
