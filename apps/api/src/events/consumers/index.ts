import { registerEmailConsumer } from "./email.consumer.js";

/**
 * Wire up all event consumers. Called once at startup. In Phase 2 each
 * consumer becomes (or is replaced by) a Kafka consumer group.
 */
export function registerConsumers(): void {
  registerEmailConsumer();
}
