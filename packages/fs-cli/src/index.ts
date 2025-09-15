import { init } from './commands/init';
import { reindex } from './commands/reindex';
import { verify } from './commands/verify';
import { compact } from './commands/compact';
import { convertLegacy } from './commands/convert-legacy';

function help() {
  console.log(`Usage: logseqfs <command> [graphDir]
Commands:
  init
  reindex
  verify
  compact
  convert-legacy
`);
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const [cmd, dir = process.cwd()] = argv;
  switch (cmd) {
    case undefined:
    case '--help':
    case '-h':
      help();
      return;
    case 'init':
      await init(dir);
      return;
    case 'reindex':
      await reindex(dir);
      return;
    case 'verify':
      await verify(dir);
      return;
    case 'compact':
      await compact(dir);
      return;
    case 'convert-legacy':
      await convertLegacy(dir);
      return;
    default:
      console.error(`Unknown command: ${cmd}`);
      help();
      process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
