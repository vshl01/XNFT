/**
 * Domain event catalogue. These names map 1:1 to Kafka topics in Phase 2.
 * Producing code emits a `DomainEvent` via the EventBus; today an in-memory
 * bus delivers them, later a Kafka producer publishes to these topics and
 * dedicated consumers (email, notifications, analytics) react.
 */
export const AuthEvents = {
  UserRegistered: "user.registered",
  UserLoggedIn: "user.logged_in",
  UserLoggedOut: "user.logged_out",
} as const;

export type EventName =
  (typeof AuthEvents)[keyof typeof AuthEvents];

/** Payloads per event — extend this map as new events are introduced. */
export interface EventPayloads {
  [AuthEvents.UserRegistered]: {
    userId: string;
    email: string;
    displayName: string;
  };
  [AuthEvents.UserLoggedIn]: {
    userId: string;
    email: string;
    at: string;
  };
  [AuthEvents.UserLoggedOut]: {
    userId: string;
  };
}

export interface DomainEvent<T extends EventName = EventName> {
  name: T;
  payload: EventPayloads[T];
  /** ISO timestamp set by the producer. */
  occurredAt: string;
}
