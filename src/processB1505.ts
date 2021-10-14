import { processorCli } from '@mylims/base-processor';
import type { ProcessorType } from '@mylims/base-processor/lib/types';
import { fromB1505, toJcamp } from 'iv-spectrum';

const processB1505: ProcessorType = (content, filename, username) => {
  const value = content.toString();
  const analyses = fromB1505(value);
  return analyses.map((analysis) => {
    const jcamp = toJcamp(analysis);
    return {
      file: jcamp,
      sampleCode: [filename],
      filename: `${filename}.jdx`,
      username: username ?? filename,
    };
  });
};

processorCli(processB1505);
