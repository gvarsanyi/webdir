import { readFileSync } from 'fs';
import { cliArgs } from './lib/cli-args';
import { printResult } from './lib/print-result';
import { start, status, stop, update } from './webdir';

(async function(): Promise<void> {
  switch (process.argv[2]) {
    case 'help': {
      console.log('Manual for webdir v' + require('../package.json').version);
      console.log(readFileSync(__dirname + '/../webdir-cli-help.txt', 'utf8'));
      break;
    }

    case 'start': {
      const { addresses, ops } = cliArgs();
      const result = await start(addresses, ops);
      printResult(result);
      process.exit(result.error ? 1 : 0);
    }

    case 'status': {
      const { addresses } = cliArgs(true);
      printResult(await status(addresses));
      break;
    }

    case 'stop': {
      const { addresses } = cliArgs(true);
      printResult(await stop(addresses));
      break;
    }

    case 'update': {
      const { addresses, ops } = cliArgs();
      const result = await update(addresses, ops);
      printResult(result);
      process.exit(result.error ? 1 : 0);
    }

    case 'version': {
      console.log('webdir v' + require('../package.json').version);
      break;
    }

    default: {
      console.error('Missing or invalid argument. For help, run:\n  webdir help');
      process.exit(1);
    }
  }
})();
