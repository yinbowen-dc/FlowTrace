import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);let url='http://127.0.0.1:8804/mcp',stdio=false,account='wrap.near';
for(let i=0;i<args.length;i++){if(args[i]==='--stdio')stdio=true;else if(args[i]==='--url'&&args[i+1])url=args[++i];else if(args[i]==='--account'&&args[i+1])account=args[++i];else throw Error('用法: npm run agent:demo -- [--stdio] [--url MCP_URL] [--account NEAR_ACCOUNT]');}
const client=new Client({name:'flowtrace-agent-example',version:'0.2.0'}),transport=stdio?new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../mcp/stdio.mjs',import.meta.url))],stderr:'inherit'}):new StreamableHTTPClientTransport(new URL(url));
try{await client.connect(transport);const {tools}=await client.listTools();console.log(JSON.stringify({transport:stdio?'stdio':'http',tools:tools.map(x=>x.name)}));for(const [name,input]of [['near_account_overview',{accountId:account}],['near_account_permissions',{accountId:account}]]){const r=await client.callTool({name,arguments:input});console.log(JSON.stringify({tool:name,isError:r.isError||false,result:r.structuredContent||r.content}));}}finally{await client.close();}
