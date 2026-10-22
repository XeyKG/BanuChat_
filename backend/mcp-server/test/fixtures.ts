import type {SqlQueryClient} from "../../api/src/data/sql-client.js";
import type {QueryEmbeddingClient} from "../../api/src/retrieval/query-embedding-client.js";
export const R="11111111-1111-4111-8111-111111111111",E="22222222-2222-4222-8222-222222222222",D="33333333-3333-4333-8333-333333333333",C="44444444-4444-4444-8444-444444444444";
export const H="a".repeat(64);
export const source={source_path:"documents/demo.md",source_locator:"document:demo",source_sha256:H};
export const config={dataset_release_id:R,embedding_config_id:E,provider:"ollama",model:"qwen3-embedding:0.6b",model_revision:H,dimension:1024,distance_metric:"cosine",parameters:{runtime_version:"0.35.0",query:{dimensions:1024,truncate:false,input_prefix:null,normalization:"none",options:{num_ctx:4096}}}};
export const embedding:QueryEmbeddingClient={async embedQuery(){return [1,...Array<number>(1023).fill(0)];}};
export function fixtureSql(options:{fail?:boolean;invalid?:boolean;empty?:boolean}={}):SqlQueryClient {
  return {async query<T>(text:string,_values?:readonly unknown[]) {
    if(options.fail) throw Object.assign(new Error("SECRET SQL private-path password"),{code:"ECONNREFUSED"});
    if(options.empty) return {rows:[]};
    if(text.includes("current_retrieval_context()")) return {rows:[config] as T[]};
    let items:unknown[]=[];
    if(text.includes("search_chunks_cosine(")) items=[{dataset_release_id:R,embedding_config_id:E,chunk_id:C,document_key:"doc-demo",document_version_id:D,document_title:"Guía ficticia",content:"Contenido ficticio.",cosine_distance:0.1,locator:"section:uno",page_start:null,page_end:null,ordinal:1,...source}];
    else if(text.includes("AS profiles")) items=[{profiles:[{profile_key:"demo-student",alias:"Personaje ficticio",source_path:"profiles/demo.json",source_locator:"/profiles/0",source_sha256:H}],courses:[{course_key:"course-demo",course_name:"Curso ficticio",status:"completed",progress_percent:"100.00",started_at:"2026-01-01T00:00:00-05:00",completed_at:"2026-02-01T00:00:00-05:00",source_path:"profiles/demo.json",source_locator:"/courses/0",source_sha256:H}]}];
    else if(text.includes("FROM banuchat.calendar_events")) items=[{event_key:"event-demo",title:"Evento ficticio",description:"Descripción ficticia",event_type:"general",starts_at:"2026-10-22T00:00:00-05:00",ends_at:null,course_key:null,announcement_key:null,source_path:"calendars/demo.json",source_locator:"/events/0",source_sha256:H}];
    else if(text.includes("FROM banuchat.announcements")) items=[{announcement_key:"announcement-demo",title:"Anuncio ficticio",description:"Descripción ficticia",valid_from:"2026-01-01T00:00:00Z",valid_until:null,source_path:"announcements/demo.json",source_locator:"/announcements/0",source_sha256:H}];
    else if(text.includes("FROM banuchat.courses")) items=[{course_key:"course-demo",name:"Curso ficticio",description:"Descripción ficticia",status:"available",source_path:"courses/demo.json",source_locator:"/courses/0",source_sha256:H}];
    else if(text.includes("FROM banuchat.document_versions")) items=[{document_key:"doc-demo",document_version_id:D,title:"Guía ficticia",retrieval_mode:"full_document",mime_type:"text/markdown",version_label:"edición ficticia 1",...source}];
    if(options.invalid) items=[{private_secret:"must not escape"}];
    return {rows:[{release_id:R,embedding_config_id:E,items}] as T[]};
  }};
}
