import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { dev } from '#dev';

await yargs(hideBin(process.argv)).command(dev).demandCommand().strict().parse();
