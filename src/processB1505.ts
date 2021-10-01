import { fromB1505, toJcamp } from 'iv-spectrum';

import type { ProcessorType } from './types';

const processB1505: ProcessorType = (content, filename) => {
  const analyses = fromB1505(content);
  return analyses.map((analysis) => {
    const jcamp = toJcamp(analysis);
    return { file: jcamp, sampleId: filename, filename: `${filename}.jsx` };
  });
};

export default processB1505;
