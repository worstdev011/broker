import type { PriceEvent, PriceEventType } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';

type EventHandler = (event: PriceEvent) => void;

export class PriceEventBus {
  private handlers: Map<PriceEventType, Set<EventHandler>> = new Map();

  on(eventType: PriceEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  emit(event: PriceEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          logger.error({ err: error, eventType: event.type }, 'Error in price event handler');
        }
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
