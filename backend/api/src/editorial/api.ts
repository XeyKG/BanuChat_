import {createHash,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Pool} from 'pg';
import {Argon2idHasher,AuthError} from '../auth/primitives.js';

const base='/api/v2/editorial';
const cookieName='__Secure-banu-editor';
const maxFile=2*1024*1024;
const maxImage=1024*1024;
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u;
const editorialColumns='id, revision, title, body, state, updated_at, published_at, file_name, kind, starts_at, ends_at, image_name, publication_category';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
class EditorialError extends Error {
 constructor(readonly status:number,message:string){super(message);}
}
function invalid():never{throw new EditorialError(400,'Revisa los campos de la solicitud.');}
function notFound():never{throw new EditorialError(404,'El contenido solicitado no está disponible.');}
function response(res:ServerResponse,status:number,value?:unknown,headers:Record<string,string>={}){
 res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
  'Content-Type':Buffer.isBuffer(value)?'application/octet-stream':'application/json; charset=utf-8',...headers});
 res.end(value===undefined?undefined:Buffer.isBuffer(value)?value:JSON.stringify(value));
}
async function body(req:IncomingMessage,limit:number):Promise<Record<string,unknown>>{
 if(!/^application\/json(?:;\s*charset=utf-8)?$/iu.test(req.headers['content-type']??'')||req.headers['content-encoding'])invalid();
 if(Number(req.headers['content-length'])>limit)throw new EditorialError(413,'El archivo supera el límite de 2 MB.');
 return new Promise((resolve,reject)=>{
  const chunks:Buffer[]=[];let length=0;
  req.on('data',(chunk:Buffer)=>{
   length+=chunk.length;
   if(length>limit){chunks.length=0;reject(new EditorialError(413,'El archivo supera el límite de 2 MB.'));return;}
   chunks.push(chunk);
  });
  req.on('end',()=>{
   if(length>limit)return;
   try{
    const parsed:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))invalid();
    resolve(parsed as Record<string,unknown>);
   }catch{reject(new EditorialError(400,'La solicitud contiene datos inválidos.'));}
  });
  req.on('error',reject);
 });
}
function field(value:unknown,max:number):string{
 if(typeof value!=='string'||!value.trim()||[...value.trim()].length>max||/[\u0000\u0001-\u0008\u000b-\u001f\u007f]/u.test(value))invalid();
 return value.trim();
}
function parseFile(value:unknown):{name:string;bytes:Buffer}|null|undefined{
 if(value==null)return value;
 if(typeof value!=='object'||Array.isArray(value))invalid();
 const {name,data}=value as Record<string,unknown>;
 const file=field(name,120);
 if(/[/\\]/u.test(file)||!/^.+\.(?:pdf|md)$/iu.test(file)||typeof data!=='string'||!data||!/^[A-Za-z0-9+/]+={0,2}$/u.test(data))invalid();
 const bytes=Buffer.from(data,'base64');
 if(!bytes.length||bytes.length>maxFile||bytes.toString('base64')!==data)throw new EditorialError(400,'Adjunta un PDF o Markdown válido de máximo 2 MB.');
 if(/\.pdf$/iu.test(file)){
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!bytes.subarray(-1024).includes(Buffer.from('%%EOF')))throw new EditorialError(400,'El archivo no tiene una estructura PDF válida.');
 }else{
  try{field(new TextDecoder('utf-8',{fatal:true}).decode(bytes),maxFile);}catch{throw new EditorialError(400,'El archivo Markdown debe contener texto UTF-8 válido.');}
 }
 return {name:file,bytes};
}
function parseImage(value:unknown){
 if(value==null)return value;
 if(typeof value!=='object'||Array.isArray(value))invalid();
 const {name,data}=value as Record<string,unknown>;
 const imageName=field(name,120);
 if(/[/\\]/u.test(imageName)||typeof data!=='string'||data.length>Math.ceil(maxImage/3)*4)invalid();
 const bytes=Buffer.from(data,'base64');
 if(!bytes.length||bytes.length>maxImage||bytes.toString('base64')!==data)invalid();
 let mime:string;
 if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&bytes.toString('ascii',12,16)==='IHDR'&&/\.png$/iu.test(imageName))mime='image/png';
 else if(bytes.length>=12&&bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))&&bytes.subarray(-2).equals(Buffer.from('ffd9','hex'))&&/\.jpe?g$/iu.test(imageName))mime='image/jpeg';
 else if(bytes.length>=16&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&bytes.readUInt32LE(4)===bytes.length-8&&/\.webp$/iu.test(imageName))mime='image/webp';
 else throw new EditorialError(400,'Selecciona una imagen PNG, JPG o WebP válida.');
 return {name:imageName,mime,bytes};
}
function date(value:unknown):string|null{
 if(value==null||value==='')return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value))invalid();
 const parsed=new Date(value);
 if(!Number.isFinite(parsed.getTime())||parsed.getUTCFullYear()<1||parsed.toISOString()!==value)invalid();
 return value;
}
function cookie(token:string,maxAge:number){
 return `${cookieName}=${token}; Path=${base}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
function adminCookie(req:IncomingMessage){
 const values=(req.headers.cookie??'').split(/;\s*/u).filter(v=>v.startsWith(cookieName+'='));
 return values.length===1&&/^[A-Za-z0-9_-]{43}$/u.test(values[0]!.slice(cookieName.length+1))?values[0]!.slice(cookieName.length+1):null;
}

export type EditorialHandler = (req:IncomingMessage,res:ServerResponse)=>Promise<void>;
export async function createEditorialHandler(pool:Pool,origin:string,verifyStudent:(token:string)=>Promise<unknown>):Promise<EditorialHandler>{
 const isLocal=origin==='http://localhost:8375';
 if(!isLocal&&origin!=='https://banuchat.duckdns.org')throw new Error('Editorial origin rejected');
 const hasher=new Argon2idHasher();
 const dummy=await hasher.hash(randomBytes(32).toString('base64url'));
 const files=new Map<string,{type:string;content:Buffer}>();
 for(const [name,type] of [['index.html','text/html'],['editor.css','text/css'],['editor.js','text/javascript']] as const){
  files.set(name,{type:type+'; charset=utf-8',content:await readFile(new URL('../../editorial-web/'+name,import.meta.url))});
 }
 let attempts=0, resetAt=0;
 async function session(req:IncomingMessage){
  const token=adminCookie(req);
  if(!token)return null;
  return (await pool.query<{username:string}>(`
   SELECT s.username FROM banuchat_editorial.sessions s
   JOIN banuchat_editorial.accounts a USING (username)
   WHERE digest=$1 AND expires_at>now() AND a.enabled
  `,[digest(token)])).rows[0]?.username??null;
 }
 return async(req,res)=>{
  try{
   const path=req.url??'';
   const method=req.method??'';
   if(!path.startsWith(base)||path.includes('?')||path.length>240)notFound();
   const suffix=path.slice(base.length);
   const asset=files.get(suffix===''||suffix==='/'?'index.html':suffix.slice(1));
   if(method==='GET'&&asset){
    response(res,200,asset.content,{'Content-Type':asset.type,'X-Frame-Options':'DENY',
     'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob: data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"});
    return;
   }
   if(method!=='GET'&&req.headers.origin!==origin)throw new EditorialError(403,'Abre el panel desde su dirección oficial.');
   if(method==='POST'&&suffix==='/login'){
    const data=await body(req,4096);
    const username=field(data.username,64).toLowerCase();
    const password=typeof data.password==='string'&&data.password.length>=1&&data.password.length<=128?data.password:invalid();
    if(Date.now()>=resetAt){resetAt=Date.now()+60_000;attempts=0;}
    if(attempts>=16)throw new EditorialError(429,'Espera un minuto antes de volver a intentar.');
    attempts++;
    const account=(await pool.query<{username:string;password_hash:string}>(`
     SELECT username,password_hash FROM banuchat_editorial.accounts WHERE username=$1 AND enabled
    `,[username])).rows[0];
    const valid=await hasher.verify(account?.password_hash??dummy,password);
    if(!account||!valid)throw new EditorialError(401,'Usuario o contraseña de administración incorrectos.');
    const token=randomBytes(32).toString('base64url');
    await pool.query('DELETE FROM banuchat_editorial.sessions WHERE expires_at<=now()');
    await pool.query("INSERT INTO banuchat_editorial.sessions(digest,username,expires_at) VALUES ($1,$2,now()+interval '8 hours')",[digest(token),username]);
    response(res,200,{username},{'Set-Cookie':cookie(token,28800)});
    return;
   }
   if(method==='POST'&&suffix==='/logout'){
    const token=adminCookie(req);
    if(token)await pool.query('DELETE FROM banuchat_editorial.sessions WHERE digest=$1',[digest(token)]);
    response(res,204,undefined,{'Set-Cookie':cookie('',0)});
    return;
   }
   const username=await session(req);
   const file= /^\/(attachments|images)\/([^/]+)$/u.exec(suffix);
   if(method==='GET'&&file&&uuid.test(file[2]!)){
    if(!username){
     const token=/^Bearer ([A-Za-z0-9_-]{43})$/u.exec(req.headers.authorization??'')?.[1];
     if(!token)throw new EditorialError(401,'Inicia sesión para descargar el archivo.');
     try{await verifyStudent(token);}catch(error){
      if(error instanceof AuthError&&error.code==='UNAUTHENTICATED')throw new EditorialError(401,'Inicia sesión para descargar el archivo.');
      throw error;
     }
    }
    const isImage=file[1]==='images';
    const selection=isImage?'image_name AS file_name,image_bytes AS file_bytes,image_mime AS mime':'file_name,file_bytes,NULL::text AS mime';
    const row=(await pool.query<{file_name:string;file_bytes:Buffer;mime:string|null}>(`
     SELECT ${selection} FROM banuchat_editorial.news
     WHERE id=$1 AND ${isImage?'image_bytes':'file_bytes'} IS NOT NULL AND ($2::boolean OR (
       state='published' AND published_at<=now()
       AND (kind='event' OR (COALESCE(starts_at,published_at)<=now() AND (ends_at IS NULL OR ends_at>=now())))
     ))
    `,[file[2],Boolean(username)])).rows[0];
    if(!row)notFound();
    if(isImage){response(res,200,{mime:row.mime,data:row.file_bytes.toString('base64')});return;}
    response(res,200,row.file_bytes,{'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(row.file_name).replace(/[!'()*]/gu,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()),'Content-Length':String(row.file_bytes.length)});
    return;
   }
   if(!username)throw new EditorialError(401,'Inicia sesión con una cuenta de administración.');
   if(method==='GET'&&suffix==='/session'){response(res,200,{username});return;}
   if(method==='GET'&&suffix==='/news'){
    const result=await pool.query(`
     SELECT ${editorialColumns},false AS from_release FROM banuchat_editorial.news
     UNION ALL
     SELECT b.id,0,b.title,b.body,'published',b.starts_at,b.starts_at,NULL,b.kind,b.starts_at,b.ends_at,NULL,'news',true
     FROM banuchat_editorial.base_items b
     JOIN banuchat.datasets d ON d.id=1 AND d.current_release_id=b.dataset_release_id
     WHERE NOT EXISTS (SELECT 1 FROM banuchat_editorial.news n WHERE n.id=b.id)
     ORDER BY updated_at DESC,id DESC
    `);
    response(res,200,{news:result.rows});return;
   }
   if(method!=='POST'||suffix!=='/news')notFound();
   const data=await body(req,Math.ceil((maxFile+maxImage)*4/3)+50000);
   const {id,revision,state}=data;
   const kind=data.kind??'news';
   const category=data.publication_category;
   if(typeof id!=='string'||!uuid.test(id)||typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<0||
      (state!=='draft'&&state!=='published'&&state!=='archived')||(kind!=='news'&&kind!=='event')||
      (category!==undefined&&category!=='news'&&(kind!=='news'||(category!=='calls'&&category!=='programming'))))invalid();
   const starts=date(data.starts_at),ends=date(data.ends_at);
   if((kind==='event'&&!starts)||(ends&&(!starts||ends<starts)))throw new EditorialError(400,'Indica la fecha de inicio. La fecha final debe ser igual o posterior.');
   const title=field(data.title,160),text=field(data.body,8000),attachment=parseFile(data.attachment),image=parseImage(data.image);
   const values=[id,title,text,state,username,attachment?.name??null,attachment?.bytes??null,kind,starts,ends,image?.name??null,image?.mime??null,image?.bytes??null];
   const result=revision===0?await pool.query(`
    INSERT INTO banuchat_editorial.news (id,title,body,state,updated_by,published_at,file_name,file_bytes,kind,starts_at,ends_at,image_name,image_mime,image_bytes,publication_category)
    VALUES($1,$2,$3,$4,$5,CASE WHEN $4='published' THEN now() END,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14,'news'))
    ON CONFLICT (id) DO NOTHING RETURNING ${editorialColumns}
   `,[...values,category??null]):await pool.query(`
    UPDATE banuchat_editorial.news SET title=$2,body=$3,state=$4,updated_by=$5,updated_at=now(),
      published_at=CASE WHEN $4='published' AND state<>'published' THEN now() ELSE published_at END,
      file_name=CASE WHEN $15 THEN $6 ELSE file_name END,file_bytes=CASE WHEN $15 THEN $7 ELSE file_bytes END,
      starts_at=$9,ends_at=$10,
      image_name=CASE WHEN $16 THEN $11 ELSE image_name END,image_mime=CASE WHEN $16 THEN $12 ELSE image_mime END,image_bytes=CASE WHEN $16 THEN $13 ELSE image_bytes END,
      publication_category=COALESCE($17,publication_category),
      revision=revision+1
    WHERE id=$1 AND kind=$8 AND revision=$14 RETURNING ${editorialColumns}
   `,[...values,revision,attachment!==undefined,image!==undefined,category??null]);
   if(!result.rows[0])throw new EditorialError(409,'La publicación cambió. Vuelve a cargarla antes de guardar.');
   response(res,revision===0?201:200,result.rows[0]);
  }catch(error){
   req.resume();
   if(res.headersSent){res.destroy();return;}
   const problem=error instanceof EditorialError?error:new EditorialError(503,'El servicio editorial no está disponible. Intenta más tarde.');
   response(res,problem.status,{message:problem.message});
  }
 };
}

