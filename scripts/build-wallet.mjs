import {build} from 'esbuild';
await build({entryPoints:['frontend/wallet.js'],outfile:'public/agent/wallet/app.js',bundle:true,format:'esm',platform:'browser',target:['safari16','chrome110'],minify:true,legalComments:'linked'});
