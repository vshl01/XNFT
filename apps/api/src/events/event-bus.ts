import { logger } from "../lib/logger.js";
import type { DomainEvent, EventName, EventPayloads } from "./events.js";

export type EventHandler<T extends EventName> = (
  event: DomainEvent<T>,
) => void | Promise<void>;

/**
 * The contract the rest of the app depends on. Services call `publish`; they
 * neither know nor care whether delivery is in-memory or Kafka. Swapping
 * implementations in Phase 2 requires zero changes to producers.
 */
export interface EventBus {
  publish<T extends EventName>(name: T, payload: EventPayloads[T]): Promise<void>;
  subscribe<T extends EventName>(name: T, handler: EventHandler<T>): void;
}

/**
 * In-memory implementation for Phase 1. Delivery is fire-and-forget and local
 * to this process — perfect for development and a single instance. Replace
 * with a `KafkaEventBus` (same interface) when the event backbone lands.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<EventName, EventHandler<EventName>[]>();

  async publish<T extends EventName>(
    name: T,
    payload: EventPayloads[T],
  ): Promise<void> {
    const event: DomainEvent<T> = {
      name,
      payload,
      occurredAt: new Date().toISOString(),
    };

    logger.debug({ event: name, payload }, "event.published");

    const subscribers = this.handlers.get(name) ?? [];
    await Promise.all(
      subscribers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          // A failing consumer must never break the producer's request path.
          logger.error({ err: error, event: name }, "event.handler_failed");
        }
      }),
    );
  }

  subscribe<T extends EventName>(name: T, handler: EventHandler<T>): void {
    const existing = this.handlers.get(name) ?? [];
    existing.push(handler as EventHandler<EventName>);
    this.handlers.set(name, existing);
  }
}

// Singleton bus shared across the app. In Phase 2 this is the only line that
// changes: `export const eventBus = new KafkaEventBus(...)`.
export const eventBus: EventBus = new InMemoryEventBus();
