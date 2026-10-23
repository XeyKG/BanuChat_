import type {DemoMode} from '../application/demo-mode.js';
import {AuthError} from './primitives.js';
export type KnowledgeMode = DemoMode;
export function knowledgeMode(value:unknown='synthetic'):KnowledgeMode {
 if(value==='synthetic'||value==='ccd_local')return value;
 throw new AuthError('DEPENDENCY_UNAVAILABLE');
}
export function knowledgeDefinition(mode:KnowledgeMode){
 if(mode==='ccd_local')return {name:'banuchat-ccd-local',synthetic:false,relation:'banuchat.ccd_demo_contexts',capabilities:['chat','history','documents'] as const};
 return {name:'banuchat-synthetic',synthetic:true,relation:'banuchat.synthetic_profiles',capabilities:['chat','history','progress','calendar','announcements','documents'] as const};
}
