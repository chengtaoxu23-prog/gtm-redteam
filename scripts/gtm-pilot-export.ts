import {mkdir,writeFile} from 'node:fs/promises';
import type {WorkspaceState} from '../src/shared/workspace.js';
import type {ResearchState} from '../src/shared/research.js';
import {researchReport} from '../server/workspace-report.js';
import {hypothesisCoverage} from '../server/workspace-coverage.js';
const base=process.env.GTM_ACCEPTANCE_URL ?? 'http://127.0.0.1:4318';
const id=process.env.GTM_CAPTURE_PROJECT;
if(!id)throw Error('Set GTM_CAPTURE_PROJECT to the public case ID');
const data=await fetch(base+'/api/gtm/workspace').then(r=>r.json()) as {state:WorkspaceState;ledger:ResearchState};
const project=data.state.projects.find(p=>p.id===id)!;
if(!project)throw Error('public_case_not_found');
const runs=data.state.runs.filter(r=>r.projectId===id), hypotheses=data.ledger.hypotheses.filter(h=>h.projectId===id);
const materials=data.state.materials.filter(m=>project.materialKeys.includes(m.id+'@'+m.revision));
const last=runs.filter(r=>r.kind!=='plan'&&r.committed&&r.status==='completed').at(-1)!;
const output='examples/public-data-pilot';await mkdir(output,{recursive:true});
await writeFile(output+'/REPORT.md',researchReport(project,last,materials,data.ledger,runs));
const summary={caseType:'Public-data Case / NOT Customer Pilot',projectId:id,model:last.model,totalRequests:runs.reduce((n,r)=>n+r.calls.length,0),failedRequests:runs.flatMap(r=>r.calls).filter(c=>c.status==='error').length,knownActualTokens:runs.flatMap(r=>r.calls).reduce((n,c)=>n+(c.usage.totalTokens??0),0),unknownUsageCalls:runs.flatMap(r=>r.calls).filter(c=>c.usage.totalTokens===null).length,
 runs:runs.map(r=>({id:r.id,kind:r.kind,status:r.status,requests:r.calls.length,createdAt:r.createdAt,completedAt:r.updatedAt,wallClockMs:Date.parse(r.updatedAt)-Date.parse(r.createdAt),providerCallMs:r.calls.reduce((n,c)=>n+(c.finishedAt?Date.parse(c.finishedAt)-Date.parse(c.startedAt):0),0),errors:r.calls.filter(c=>c.error).map(c=>({role:c.role,error:c.error,usage:c.usage}))})),
 coverage:hypotheses.flatMap(h=>hypothesisCoverage(h,materials,runs,last.id)),
 sources:materials.map(m=>({url:m.url,name:m.name,title:m.title,publishedAt:m.publishedAt??'unknown',publicationBasis:m.publicationBasis??'unknown',acquiredAt:m.acquiredAt,fileHash:m.fileHash,sourceVersion:m.revision,chunks:m.units.length})),
 pendingRecommendations:hypotheses.reduce((n,h)=>n+h.proposals.filter(p=>p.decision==='pending').length,0),humanBusinessDecisions:data.ledger.events.filter(e=>e.projectId===id&&e.actor==='user'&&e.type.startsWith('Transition')).length,manualVerificationTime:'not measured',commercialEffect:'not validated'};
await writeFile(output+'/acceptance.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({totalRequests:summary.totalRequests,actualTokens:summary.knownActualTokens,failed:summary.failedRequests,coverage:summary.coverage.slice(0,materials.length),times:summary.runs.map(r=>({kind:r.kind,wallMs:r.wallClockMs,providerMs:r.providerCallMs}))}));
