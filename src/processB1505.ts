import { fromB1505, toJcamp } from 'iv-spectrum';

import type { ProcessorType } from './types';

const processB1505: ProcessorType = (content, filename) => {
  const value = content.toString();
  const analyses = fromB1505(value);
  return analyses.map((analysis) => {
    const jcamp = toJcamp(analysis);
    return { file: jcamp, sampleId: filename, filename: `${filename}.jdx` };
  });
};

export default processB1505;
