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
}

export type ProcessorType = (
  /** Raw file content */
  content: Buffer,
  filename: string,
) => Array<{
  file?: string;
  derived?: Record<string, string>;
  meta?: Record<string, unknown>;
  sampleId: string;
  filename: string;
}>;
