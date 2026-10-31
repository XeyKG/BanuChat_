import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {classifyObservation,inspectFile} from './diagnose-ccd-historical-artifacts.mjs';
import {getDocumentArtifact} from '../../backend/api/src/application/document-artifact.ts';
import {DocumentArtifactError} from '../../backend/api/src/application/document-artifact-errors.ts';
import {ArtifactSqlClient,ArtifactFileSystem,ARTIFACT_ROOT,ARTIFACT_PATH,ARTIFACT_ROW,DOCUMENT_ID,filesystemError} from '../../backend/api/test/document-artifact-fixtures.ts';
const sha=b=>createHash('sha256').update(b).digest('hex');
const missing=e=>e instanceof DocumentArtifactError&&e.reason==='not_found';
const old=Buffer.from('Synthetic old version.\n'),current=Buffer.from('Synthetic current version.\n');
const oldRow={...ARTIFACT_ROW,version_label:'shared-version-label',source_sha256:sha(old)};
const storage=fs=>({root:ARTIFACT_ROOT,version_roots:{'shared-version-label':ARTIFACT_ROOT},filesystem:fs});
test('same name and label with newer bytes explains displacement without accepting the wrong historical file',async()=>{
 const fs=new ArtifactFileSystem();fs.bytes=current;
 assert.equal(classifyObservation({exists:true,available_sha256:sha(current),expected_sha256:sha(old),reused_by_current:true}),'D');
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
 const result=await getDocumentArtifact(new ArtifactSqlClient([{...oldRow,source_sha256:sha(current)}]),{document_version_id:DOCUMENT_ID},storage(fs));
 assert.deepEqual(result.bytes,current);
});
test('absent historical file is A and the real reader returns not_found',async()=>{
 const fs=new ArtifactFileSystem();fs.targetError=filesystemError('ENOENT');
 assert.equal(classifyObservation({exists:false,expected_sha256:sha(old)}),'A');
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
});
test('exact historical copy in an explicitly authorized version root is accepted by hash',async()=>{
 const fs=new ArtifactFileSystem();fs.bytes=old;
 const result=await getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs));
 assert.equal(sha(result.bytes),sha(old));
 assert.equal(classifyObservation({exists:true,available_sha256:sha(old),expected_sha256:sha(old)}),'MATCH');
});
test('an exact copy elsewhere is a location hypothesis, never an automatic runtime fallback',async()=>{
 const fs=new ArtifactFileSystem();fs.bytes=current;
 assert.equal(classifyObservation({exists:true,available_sha256:sha(current),expected_sha256:sha(old),correct_copy_elsewhere:true}),'C');
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
});
test('hash mismatch without evidence of replacement remains B',async()=>{
 const fs=new ArtifactFileSystem();fs.bytes=current;
 assert.equal(classifyObservation({exists:true,available_sha256:sha(current),expected_sha256:sha(old)}),'B');
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
});
test('unknown file availability remains undetermined instead of being treated as absence',()=>{
 assert.equal(classifyObservation({expected_sha256:sha(old)}),'E');
});
test('a non-ready release is filtered before the reader touches the filesystem',async()=>{
 const fs=new ArtifactFileSystem();
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
 assert.equal(fs.calls.length,0);
});
test('invalid relative paths are rejected before filesystem access',async()=>{
 for(const path of ['documents/../private','C:/outside.md','documents/a\\b','documents//x']){
  await assert.rejects(inspectFile('unused-root',path));
  const fs=new ArtifactFileSystem();
  await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([{...oldRow,source_path:path}]),{document_version_id:DOCUMENT_ID},storage(fs)),e=>e instanceof DocumentArtifactError&&e.reason==='invalid_database_result');
  assert.equal(fs.calls.length,0);
 }
});
test('a path escaping the root after realpath is rejected without reading its content',async()=>{
 const fs=new ArtifactFileSystem();fs.targetRealpath=resolve(ARTIFACT_ROOT,'..','outside.md');
 await assert.rejects(getDocumentArtifact(new ArtifactSqlClient([oldRow]),{document_version_id:DOCUMENT_ID},storage(fs)),missing);
 assert.equal(fs.calls.some(c=>c.operation==='readFile'),false);
 assert.notEqual(fs.targetRealpath,ARTIFACT_PATH);
});
