import EventEmitter from 'events';

class AppEmitter extends EventEmitter {}

export const appEvents = new AppEmitter();

// Define Event Constants
export const EVENTS = {
    ORDER_COMPLETED: 'CHALLENGE_EVALUATION',
    ORDER_CREATED: 'ORDER_CREATED'
};
