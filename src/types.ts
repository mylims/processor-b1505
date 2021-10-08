// Event related types
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}
export enum EventDataType {
  FILE = 'file',
}

export interface EventProcessor {
  processorId: string;
  history: EventHistory[];
}

export interface EventHistory {
  processId: string;
  status: EventStatus;
  date: Date;
  message?: string;
}

export interface EventData {
  type: EventDataType;
  fileId: string;
}

export interface Event {
  _id: string;
  topic: string;
  data: EventData;
  createdAt: Date;
  processors: EventProcessor[];
}

// Processor related types
export interface ProcessorParams {
  interval?: number;
  verbose: boolean;
  username?: string;
}

export type ProcessorType = (
  /** Raw file content */
  content: Buffer,
  filename: string,
  username?: string,
) => Array<{
  file?: string;
  derived?: Record<string, string>;
  description?: string;
  sampleCode: string[];
  filename: string;
  username: string;
}>;
