import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import Processor from './Processor';
import processB1505 from './processB1505';
import type { ProcessorType } from './types';

export { Processor };
export type { ProcessorType };
export type { ProcessorParams } from './types';

export function processorCli(processorFunc: ProcessorType) {
  const { verbose, interval } = yargs(hideBin(process.argv))
    // Define the command line options
    .options({
      verbose: {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
        default: false,
      },
      interval: {
        alias: 'i',
        type: 'number',
        description: 'Interval in seconds',
        demandOption: false,
      },
    })
    .usage('Usage: $0 <command> [options]')
    .command('process', 'start the processor')
    .example(
      '$0 process --interval 10',
      'count the lines in the given file',
    ).argv;

  const processor = new Processor({ verbose, interval });
  processor.run(processorFunc).catch((err) => processor.logger.error(err));
}

// Main entry point
processorCli(processB1505);
