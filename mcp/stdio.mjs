import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {createMcpServer} from './server.mjs';
import {createAgentService} from '../agent/service.mjs';
const service=createAgentService();
const handle=serveStdio(()=>createMcpServer({service}),{onerror:e=>process.stderr.write(`MCP: ${e.code||e.name||'error'}\n`)});
process.on('SIGTERM',()=>handle.close().finally(()=>process.exit(0)));
process.on('SIGINT',()=>handle.close().finally(()=>process.exit(0)));
