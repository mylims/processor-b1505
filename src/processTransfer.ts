import path from 'path';

import { processorCli } from '@mylims/base-processor';
import type { ProcessorType } from '@mylims/base-processor/lib/types';
import { fromTransfer, toJcamp } from 'iv-spectrum';

const processTransfer: ProcessorType = (content, filename, username) => {
  const value = content.toString();
  const analyses = fromTransfer(value);
  const fileName = path.basename(filename);
  const title = /_#(?<code>.+?)__/.exec(filename)?.groups?.code ?? fileName;
  const sampleCode = ['#0000', 'A4'];
  return analyses.map((analysis) => {
    const file = toJcamp(analysis);
    const { meta = {} } = analysis.getXYSpectrum() ?? {};
    const { thresholdVoltage, subthresholdSlope } = meta;
    return {
      file,
      sampleCode,
      title,
      filename: `${fileName}.jdx`,
      username: username ?? 'transfer_test',
      derived:
        thresholdVoltage && subthresholdSlope
          ? { thresholdVoltage, subthresholdSlope }
          : undefined,
    };
  });
};

processorCli(processTransfer);
