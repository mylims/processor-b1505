import {
  Processor,
  processorCli,
  ProcessorConfig,
} from '@mylims/base-processor';
import { fromB1505, toJcamp } from 'iv-analysis';

const config: ProcessorConfig = {
  topic: 'b1505',
  processor: processorFunc,
};

async function processorFunc(processor: Processor) {
  if (!processor.file) throw new Error('Missing file');

  const { filename } = processor.file;
  const username = filename.split('_')[0];
  const sampleCode = filename.split('_').slice(1);
  const content = await processor.file.read();
  const analyses = fromB1505(content.toString());

  for (const analysis of analyses) {
    const jcamp = toJcamp(analysis);
    const measurement = analysis.getFirstMeasurement();
    processor.addMeasurement({
      file: {
        content: jcamp,
        filename: `${filename}.jdx`,
        mimetype: 'chemical/x-jcamp-dx',
      },
      measurementType: 'iv',
      derivedData: measurement.derived ?? {},
      sampleCode,
      username,
    });
  }
}

processorCli(config);
