import { promisify } from 'util';

import dotenv from 'dotenv';
import FormData from 'form-data';
import got from 'got';
import pino from 'pino';

import { ProcessorParams, EventStatus, Event, ProcessorType } from './types';

const asyncTimeout = promisify(setTimeout);

export default class Processor {
  public logger = pino({ prettyPrint: { colorize: true } });
  private envs: {
    token: string;
    topic: string;
    eventUrl: string;
    processorId: string;
    fileEndpoint: string;
    uploadEndpoint: string;
    collectionName: string;
  };
  private interval?: number;
  private username?: string;

  public constructor({ interval, verbose, username }: ProcessorParams) {
    this.interval = interval;
    this.username = username;
    this.logger.level = verbose ? 'debug' : 'info';

    // Save env variables
    const env = dotenv.config();
    if (env.parsed) {
      this.envs = {
        topic: env.parsed.EVENTS_TOPIC,
        token: env.parsed.SERVICE_TOKEN,
        eventUrl: env.parsed.EVENTS_ENDPOINT,
        processorId: env.parsed.PROCESSOR_ID,
        fileEndpoint: env.parsed.FILE_DOWNLOAD_ENDPOINT,
        uploadEndpoint: env.parsed.FILE_UPLOAD_ENDPOINT,
        collectionName: env.parsed.PROCESSOR_COLLECTION,
      };
    } else {
      throw new Error('Missing environment variables');
    }
  }

  public async run(processor: ProcessorType) {
    if (this.interval !== undefined) {
      while (true) {
        await this.executeProcessor(processor);
        await this.wait();
      }
    } else {
      await this.executeProcessor(processor);
    }
  }

  private async wait() {
    if (this.interval !== undefined) {
      this.logger.info(`Waiting ${this.interval} seconds...`);
      await asyncTimeout(this.interval * 1000);
    }
  }

  private async executeProcessor(processor: ProcessorType) {
    const event = await this._fetchEvent();
    if (event) {
      const eventId = event.event._id;
      const processId = event.processId;
      const { status, message } = await this._processEvent(
        eventId,
        event.event.data.fileId,
        processor,
      );
      return this._setEventStatus(eventId, processId, status, message);
    }
  }

  private async _fetchEvent() {
    const nextEventUrl = `${this.envs.eventUrl}/next-event`;
    this.logger.info('Checking for new events...');

    try {
      const event = await got
        .post(nextEventUrl, {
          json: { topic: this.envs.topic, processorId: this.envs.processorId },
          headers: { Authorization: this.envs.token },
        })
        .json<Event>();
      const processId = event.processors.find(
        (processor) => this.envs.processorId === processor.processorId,
      )?.history[0].processId;
      if (!processId) {
        throw new Error(`Process ${this.envs.processorId} not found`);
      }
      return { event, processId };
    } catch (error) {
      this.logger.error(error, 'Failed new event fetch');
    }
  }

  private async _processEvent(
    eventId: string,
    fileId: string,
    processor: ProcessorType,
  ): Promise<{ status: EventStatus; message?: string }> {
    try {
      // Fetch the original file
      this.logger.debug(`Fetching file ${fileId}...`);
      const { headers, body } = await got.post(this.envs.fileEndpoint, {
        responseType: 'buffer',
        json: { fileId },
        headers: { Authorization: this.envs.token },
      });

      // Extract filename from headers
      const filename =
        headers['content-disposition']
          ?.split(';')[1]
          ?.match(/"(?<id>.*?)\.csv"/)?.groups?.id ?? fileId;

      this.logger.info('Processing event ...', eventId);
      const results = processor(body, filename, this.username);

      // Send the results to the server
      for (const result of results) {
        const formData = new FormData();
        if (result.file) formData.append('file', result.file, result.filename);
        if (result.derived) {
          formData.append('derived', JSON.stringify(result.derived));
        }
        if (result.description) {
          formData.append('description', result.description);
        }
        formData.append('sampleCode', result.sampleCode.join(','));
        formData.append('username', result.username);

        formData.append('collection', this.envs.collectionName);

        formData.append('eventId', eventId);

        await got.post(this.envs.uploadEndpoint, {
          body: formData,
          headers: { Authorization: this.envs.token },
        });
        this.logger.info('Result uploaded', eventId, filename);
      }

      this.logger.info('Finished event processing', eventId);
      return { status: EventStatus.SUCCESS };
    } catch (error) {
      this.logger.error(error, eventId);
      return { status: EventStatus.ERROR, message: error.message };
    }
  }

  private _setEventStatus(
    eventId: string,
    processId: string,
    status: EventStatus,
    message?: string,
  ) {
    const payload = {
      eventId,
      processId,
      processorId: this.envs.processorId,
      status,
      message,
    };
    return got.put(`${this.envs.eventUrl}/set-event`, {
      json: payload,
      headers: { Authorization: this.envs.token },
    });
  }
}
