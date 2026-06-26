import { eventBus } from "../event-bus.js";
import { AuthEvents } from "../events.js";
import { logger } from "../../lib/logger.js";

/**
 * Example consumer demonstrating the event-driven pattern. Today it just logs;
 * in Phase 2 this becomes a standalone Kafka consumer that calls the email
 * service to send a real welcome email. Producers (auth.service) stay
 * unchanged — only the subscription target moves.
 */
export function registerEmailConsumer(): void {
  eventBus.subscribe(AuthEvents.UserRegistered, async (event) => {
    logger.info(
      { userId: event.payload.userId, email: event.payload.email },
      "email.welcome.queued",
    );
    // Phase 2: await emailService.sendWelcome(event.payload)
  });
}
