import assert from 'node:assert/strict';
import test from 'node:test';
import {documentProvenanceLabel} from '../src/api/documents';

test('mixed demonstration labels each authenticated artifact by its actual provenance',()=>{
 assert.equal(documentProvenanceLabel('Procedencia: CCD seleccionado para demostración; sin aval institucional.\n\nReferencia acotada.',false),'Referencia CCD seleccionada · sin aval institucional');
 assert.equal(documentProvenanceLabel('Contenido sintético de demostración; no representa información institucional real.',true),'Material ficticio de demostración');
 assert.equal(documentProvenanceLabel('# Ejemplo\nsynthetic: true\n',true),'Material ficticio de demostración');
 assert.equal(documentProvenanceLabel('Documento CCD anterior',true),'Fuente documental CCD seleccionada · sin aval institucional');
});
