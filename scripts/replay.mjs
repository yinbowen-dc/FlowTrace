import {readFile} from 'node:fs/promises';
import {replayBundle} from '../public/lib/core.js';
try{if(!process.argv[2])throw Error('用法：npm run replay -- /path/to/evidence.json');const data=await readFile(process.argv[2],'utf8');if(Buffer.byteLength(data)>8*1024*1024)throw Error('证据文件最大8MB');console.log(JSON.stringify(await replayBundle(JSON.parse(data)),null,2));}
catch(e){console.error(e.message);process.exitCode=1;}
