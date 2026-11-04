import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
await build({entryPoints:['frontend/wallet.js'],outfile:'public/agent/wallet/app.js',bundle:true,format:'esm',platform:'browser',target:['safari16','chrome110'],minify:true,legalComments:'linked'});

// Normalize trailing whitespace in the connector's embedded CSS for reproducible checked-in bundles.
const output='public/agent/wallet/app.js';
await writeFile(output,(await readFile(output,'utf8')).replace(/[\t ]+$/gm,''));

const hashFile=async path=>createHash('sha256').update(await readFile(path)).digest('hex').slice(0,12);
const page='public/agent/wallet/index.html';
const jsHash=await hashFile(output),cssHash=await hashFile('public/agent/wallet/style.css');
await writeFile(page,(await readFile(page,'utf8')).replace(/src="\.\/app\.js(?:\?v=[^"]*)?"/,'src="./app.js?v='+jsHash+'"').replace(/href="\.\/style\.css(?:\?v=[^"]*)?"/,'href="./style.css?v='+cssHash+'"'));
