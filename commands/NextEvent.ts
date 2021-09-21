import { promisify } from 'util';

import { BaseCommand, flags } from '@adonisjs/core/build/standalone';
import fetch from 'node-fetch';
import { fromB1505, toJcamp } from 'iv-spectrum';

const asyncTimeout = promisify(setTimeout);

enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}
enum EventDataType {
  FILE = 'file',
}

interface EventProcessor {
  processorId: string;
  history: EventHistory[];
}

interface EventHistory {
  processId: string;
  status: EventStatus;
  date: Date;
  message?: string;
}

interface EventData {
  type: EventDataType;
  fileId: string;
}

interface Event {
  id: string;
  topic: string;
  data: EventData;
  createdAt: Date;
  processors: EventProcessor[];
}

export default class NextEvent extends BaseCommand {
  public static commandName = 'event:next';
  public static description = 'Checks for a new available event';
  public static settings = { loadApp: true };

  @flags.number({ description: 'Timeout in seconds' })
  public interval: number;

  private envs: {
    eventUrl: string;
    processorId: string;
    fileEndpoint: string;
    uploadEndpoint: string;
  };

  public async run() {
    if (this.interval !== undefined) {
      while (true) {
        await this.executeProcessor();
        await this.wait();
      }
    } else {
      await this.executeProcessor();
    }
  }

  private async wait() {
    this.logger.info(`Waiting ${this.interval} seconds...`);
    await asyncTimeout(this.interval * 1000);
  }

  private async executeProcessor() {
    const { default: Env } = await import('@ioc:Adonis/Core/Env');
    const eventUrl = Env.get('EVENTS_ENDPOINT');
    const nextEventUrl = `${eventUrl}/next-event`;
    const topic = Env.get('EVENTS_TOPIC');
    const processorId = Env.get('PROCESSOR_ID');
    const fileEndpoint = Env.get('FILE_DOWNLOAD_ENDPOINT');
    const uploadEndpoint = Env.get('FILE_UPLOAD_ENDPOINT');
    this.envs = { fileEndpoint, uploadEndpoint, processorId, eventUrl };

    this.logger.info('Checking for new events...');

    try {
      const response = await fetch(nextEventUrl, {
        method: 'POST',
        body: JSON.stringify({ topic, processorId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const event = (await response.json()) as Event;
      const processId = event.processors.find(
        (processor) => processorId === processor.processorId,
      )?.history[0].processId;
      const fileId = event.data.fileId;
      if (!processId) throw new Error(`Process ${processorId} not found`);

      await this.processEvent(event.id, processId, fileId);
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async processEvent(
    eventId: string,
    processId: string,
    fileId: string,
  ) {
    try {
      const fileUrl = `${this.envs.fileEndpoint}?id=${fileId}`;
      const content = await (await fetch(fileUrl)).text();
      const analyses = fromB1505(content);
      for (const analysis of analyses) {
        const jcamp = toJcamp(analysis);
        await fetch(this.envs.uploadEndpoint, {
          method: 'POST',
          body: jcamp,
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }

      const payload = {
        eventId,
        processId,
        processorId: this.envs.processorId,
        status: EventStatus.SUCCESS,
      };
      await fetch(`${this.envs.eventUrl}/set-event`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const payload = {
        eventId,
        processId,
        processorId: this.envs.processorId,
        status: EventStatus.ERROR,
        message: error.message,
      };
      await fetch(`${this.envs.eventUrl}/set-event`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
