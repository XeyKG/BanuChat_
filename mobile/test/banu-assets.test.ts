import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('Banu artwork preserves the three supplied originals, dimensions and alpha-capable PNG format',()=>{
  const root=new URL('../assets/images/banu/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('provenance.json',root),'utf8')) as {width:number;height:number;assets:{file:string;sha256:string}[]};
  assert.equal(manifest.assets.length,3);
  for(const asset of manifest.assets){
    const png=readFileSync(new URL(asset.file,root));
    assert.equal(createHash('sha256').update(png).digest('hex'),asset.sha256,asset.file+' changed from supplied original');
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.toString('ascii',12,16),'IHDR');
    assert.equal(png.readUInt32BE(16),manifest.width);assert.equal(png.readUInt32BE(20),manifest.height);
    assert.equal(png[25],6,'RGBA PNG required');
  }
});
