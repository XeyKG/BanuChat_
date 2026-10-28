import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {ccdArtifactStorage} from '../src/authenticated-main.js';
import {getDocumentArtifact,type DocumentArtifactFileSystem} from '../src/application/document-artifact.js';
import {DocumentArtifactError} from '../src/application/document-artifact-errors.js';
import {ARTIFACT_BYTES,ARTIFACT_ROW,ArtifactSqlClient,DOCUMENT_ID} from './document-artifact-fixtures.js';

function controlledFilesystem(root:string,bytes=ARTIFACT_BYTES){
 const target=resolve(root,ARTIFACT_ROW.source_path);
 const calls:Array<{operation:string;path:string}>=[];
 const filesystem:DocumentArtifactFileSystem={
  async realpath(path){calls.push({operation:'realpath',path});assert.ok(path===root||path===target);return path;},
  async stat(path){calls.push({operation:'stat',path});assert.ok(path===root||path===target);return {isDirectory:()=>path===root,isFile:()=>path===target};},
  async readFile(path){calls.push({operation:'readFile',path});assert.equal(path,target);return bytes;},
 };
 return {filesystem,calls,target};
}

test('normal CCD storage explicitly registers v2 and preserves every historical root',()=>{
 const storage=ccdArtifactStorage();
 const directory=(relative:string)=>fileURLToPath(new URL('../../../data/ccd/local/'+relative+'/',import.meta.url));
 assert.equal(storage.root,directory('m01-m12'));
 assert.deepEqual(storage.version_roots,{
  'bch03-m01-m12-local-1':directory('m01-m12'),
  'bch03-ccd-local-2':directory('expanded-v2'),
  'bch03-ccd-local-3':directory('guidance-v3'),
  'bch-ccd-knowledge-1':directory('product-knowledge-v1'),
  'bch-ccd-knowledge-2':directory('product-knowledge-v2'),
 });
});

test('v2 artifact uses its specific normal-runtime root instead of the default or v1 root',async()=>{
 const storage=ccdArtifactStorage(),root=storage.version_roots['bch-ccd-knowledge-2'];
 const {filesystem,calls,target}=controlledFilesystem(root);
 const sql=new ArtifactSqlClient([{...ARTIFACT_ROW,version_label:'bch-ccd-knowledge-2'}]);
 const result=await getDocumentArtifact(sql,{document_version_id:DOCUMENT_ID},{...storage,filesystem});
 assert.deepEqual(result,{document_version_id:DOCUMENT_ID,bytes:ARTIFACT_BYTES});
 assert.notEqual(root,storage.root);assert.notEqual(root,storage.version_roots['bch-ccd-knowledge-1']);
 assert.deepEqual(calls,[{operation:'realpath',path:root},{operation:'stat',path:root},
  {operation:'realpath',path:target},{operation:'stat',path:target},{operation:'readFile',path:target}]);
});

test('normal CCD storage rejects unknown and inherited labels without filesystem access',async()=>{
 for(const version_label of ['bch-ccd-knowledge-999','bch-ccd-knowledge-2-extra','constructor']){
  const storage=ccdArtifactStorage(),{filesystem,calls}=controlledFilesystem(storage.version_roots['bch-ccd-knowledge-2']);
  await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([{...ARTIFACT_ROW,version_label}]),
   {document_version_id:DOCUMENT_ID},{...storage,filesystem}),
  (error:unknown)=>error instanceof DocumentArtifactError&&error.reason==='not_found');
  assert.equal(calls.length,0);
 }
});

test('v2 root still rejects bytes with an incorrect SHA without substituting other roots',async()=>{
 const storage=ccdArtifactStorage(),root=storage.version_roots['bch-ccd-knowledge-2'];
 const {filesystem,calls,target}=controlledFilesystem(root,Buffer.from('different fixture bytes'));
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([{...ARTIFACT_ROW,version_label:'bch-ccd-knowledge-2'}]),
  {document_version_id:DOCUMENT_ID},{...storage,filesystem}),
 (error:unknown)=>error instanceof DocumentArtifactError&&error.reason==='not_found');
 assert.deepEqual(calls.filter(c=>c.operation==='readFile'),[{operation:'readFile',path:target}]);
 assert.equal(calls[0]?.path,root);
});
