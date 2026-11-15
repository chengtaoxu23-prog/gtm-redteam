// Configuration is local-only. Constructing a Provider never dispatches a request.
import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import {createGtmApp} from './gtm-api.js';
import {AuditRepository} from './gtm-repository.js';
import {configureGtmRuntime} from './gtm-runtime.js';
dotenv.config({path:'.env.gtm.local'});
const {runtime,config}=configureGtmRuntime(process.env);
if(runtime.mode!=='real')throw Error('Real Research Workspace requires GTM_PROVIDER=openai-compatible. Use explicit offline commands for historical demos.');
const service=createGtmApp(process.env.GTM_DATA_DIR ? new AuditRepository(path.resolve(process.env.GTM_DATA_DIR)) : undefined,config,120,runtime),app=express();let ready=false;
app.use((_req,res,next)=>{if(!ready){res.status(503).json({error:'正在恢复本地研究记录，请稍后重试。'});return;}next();});
app.use(service.app);
app.use(express.static(path.resolve('dist/web')));
app.get('*',(_req,res)=>res.sendFile(path.resolve('dist/web/index.html')));
// Bind before recovery: a second launcher must never mark another live process's runs interrupted.
const port=Number(process.env.GTM_PORT ?? 4317);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_local_port');
const server=app.listen(port,'127.0.0.1');
try{await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});await service.init();ready=true;console.log(`GTM-RedTeam http://127.0.0.1:${port} — REAL PROVIDER`);}
catch{server.close();console.error('GTM server could not start or recover local research records.');process.exitCode=1;}
