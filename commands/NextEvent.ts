import { promisify } from 'util';

import { BaseCommand, flags } from '@adonisjs/core/build/standalone';
import { fromB1505, toJcamp } from 'iv-spectrum';

import got from 'got';

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
  _id: string;
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
    const { default: got } = await import('got');

    // Environment variables
    const eventUrl = Env.get('EVENTS_ENDPOINT');
    const nextEventUrl = `${eventUrl}/next-event`;
    const topic = Env.get('EVENTS_TOPIC');
    const processorId = Env.get('PROCESSOR_ID');
    const fileEndpoint = Env.get('FILE_DOWNLOAD_ENDPOINT');
    const uploadEndpoint = Env.get('FILE_UPLOAD_ENDPOINT');
    this.envs = { fileEndpoint, uploadEndpoint, processorId, eventUrl };

    this.logger.info('Checking for new events...');

    try {
      const event = await got
        .post(nextEventUrl, { json: { topic, processorId } })
        .json<Event>();
      const processId = event.processors.find(
        (processor) => processorId === processor.processorId,
      )?.history[0].processId;
      const fileId = event.data.fileId;
      if (!processId) throw new Error(`Process ${processorId} not found`);

      this.logger.debug(
        JSON.stringify({ eventId: event._id, processId, fileId }),
      );
      await this.processEvent(event._id, processId, fileId);
    } catch (error) {
      this.logger.error(error, 'fetching');
    }
  }

  private async processEvent(
    eventId: string,
    processId: string,
    fileId: string,
  ) {
    try {
      const { default: FormData } = await import('form-data');

      const fileUrl = `${this.envs.fileEndpoint}?id=${fileId}`;
      const { headers, body } = await got.get(fileUrl);
      const filename =
        headers['content-disposition']
          ?.split(';')[1]
          ?.match(/"(?<id>.*?)\.csv"/)?.groups?.id ?? fileId;

      this.logger.info('Processing event ...', eventId);
      const analyses = fromB1505(body);
      for (const analysis of analyses) {
        const jcamp = toJcamp(analysis);

        const formData = new FormData();
        formData.append('file', jcamp, `${filename}.jdx`);
        formData.append('filename', `${filename}.jdx`);
        formData.append('eventId', eventId);
        // TODO: get sampleId from analysis
        formData.append('sampleId', filename);

        await got.post(this.envs.uploadEndpoint, { body: formData });
        this.logger.info('File uploaded', eventId, filename);
      }

      const payload = {
        eventId,
        processId,
        processorId: this.envs.processorId,
        status: EventStatus.SUCCESS,
      };
      await got.put(`${this.envs.eventUrl}/set-event`, { json: payload });
      this.logger.info('Finished event processing', eventId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.logger.error(error?.message, eventId);
      const payload = {
        eventId,
        processId,
        processorId: this.envs.processorId,
        status: EventStatus.ERROR,
        message: error.message,
      };
      await got.put(`${this.envs.eventUrl}/set-event`, { json: payload });
    }
  }
}
