
import { EventEmitter } from 'events';

// This is a global event emitter for handling specific app-wide events,
// such as Firestore permission errors.
export const errorEmitter = new EventEmitter();
