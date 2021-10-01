import pino from 'pino';
import PinoPretty from 'pino-pretty';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import Processor from './Processor';
import processB1505 from './processB1505';
import { ProcessorType } from './types';

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

// Main entry point
export function main(specificProcessor: ProcessorType) {
  new Processor({ verbose, interval })
    .run(specificProcessor)
    .catch((err) =>
      pino({ prettyPrint: { colorize: true }, prettifier: PinoPretty }).error(
        err,
      ),
    );
}
main(processB1505);
