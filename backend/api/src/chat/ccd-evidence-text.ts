const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const generic=new Set('segun incluye incluyen describe describen contenidos contenido temario syllabus practicas practica curso cursos cuales estas estos tiene sobre para como'.split(' '));
const unsafe=/(?:ignora|ignore|desobedece|revela|reveal|override|system\s*prompt|assistant\s*:|<\|system|instrucciones?\s+(?:anteriores|del sistema)|token|password|contrasena|secreto)/iu;

/** Read only bounded, published factual sections, never the rest of an artifact.
 * Details remain untrusted evidence under the existing generator instruction. */
export function ccdEvidenceText(content:string,query:string,limit=1600):string {
 const lines=content.replace(/\r\n?/gu,'\n').split('\n');
 const statement=lines.join('\n').split(/\n\s*\n/u)[1]?.trim()??'';
 const summary=statement.split('\n').filter(line=>!unsafe.test(normalize(line))).join('\n').slice(0,limit);
 const terms=[...new Set(normalize(query).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=4&&!generic.has(w)).map(w=>w.slice(0,5)))];
 const candidates:string[]=[];let section=false,code=false,paragraph:string[]=[];
 const flush=()=>{
  const value=paragraph.join('\n');paragraph=[];
  if(!value||unsafe.test(normalize(value)))return;
  const words=normalize(value).split(/[^\p{L}\p{N}]+/u);
  if(terms.some(term=>words.some(w=>w.startsWith(term))))candidates.push(value);
 };
 for(const line of lines){
  if(/^\s*```|^\s*~~~/u.test(line)){flush();code=!code;continue;}
  if(code)continue;
  const heading=line.trim().replace(/^#{1,6}\s*/u,'').replace(/:\s*$/u,'');
  if(/^(?:detalle documental|contenidos documentados)$/u.test(normalize(heading))){flush();section=true;continue;}
  if(/^\s*#{1,6}\s/u.test(line)||(/^\S[^.!?]*:\s*$/u.test(line)&&line.trim())){flush();section=false;continue;}
  if(!section)continue;
  if(!line.trim()){flush();continue;}
  if(/^\s*(?:[•*-]|\d+[.)])\s/u.test(line))flush();
  // Wrapped conditions stay with their factual paragraph/bullet. Selecting only
  // its first line could silently turn a conditional practice into a guarantee.
  paragraph.push(line.trim());
 }
 flush();
 let result=summary;
 for(const detail of candidates){const addition='\n'+detail;if(result.length+addition.length>limit)break;result+=addition;}
 return result;
}
