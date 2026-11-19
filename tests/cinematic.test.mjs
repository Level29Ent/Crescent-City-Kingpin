import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceTexture, surfaceUVs, createFilmGrade} from '../src/cinematic.ts';
import {newFrameBudget, renderBudget} from '../src/performance.ts';

test('surface art is deterministic, tileable and mipmapped without external assets', () => {
  for (const kind of ['street', 'plaster']) {
    const a=surfaceTexture(kind), b=surfaceTexture(kind);
    assert.deepEqual(a.image.data,b.image.data);
    assert.equal(a.image.width,256);
    assert.equal(a.image.data.length,256*256*4);
    assert.ok(a.generateMipmaps);
    assert.ok(new Set(a.image.data).size>30);
    for(let i=3;i<a.image.data.length;i+=4)assert.equal(a.image.data[i],255);
    a.dispose();b.dispose();
  }
  const a=surfaceTexture('street'),b=surfaceTexture('plaster');
  assert.notDeepEqual(a.image.data,b.image.data);a.dispose();b.dispose();
});

test('world-scaled surface UVs handle floors and either facade direction', () => {
  const uv=surfaceUVs([4,8,12,4,8,12,4,8,12],[0,1,0,1,0,0,0,0,-1]);
  assert.deepEqual([...uv],[1,3,3,2,1,2]);
  // Adjacent chunks use identical coordinates at the seam.
  assert.deepEqual([...surfaceUVs([4,0,8],[0,1,0])],[1,2]);
  assert.deepEqual([...surfaceUVs([4,0,8],[0,1,0],2)],[2,4]);
});

test('contact shadows stay cinematic-only while adaptive mode retains its fallback', () => {
  const b=newFrameBudget();
  for(const mode of ['auto','balanced','performance'])assert.equal(renderBudget(mode,b,2).contactShadows,false);
  assert.equal(renderBudget('cinematic',b,2).contactShadows,true);
  b.scale=.6;
  const low=renderBudget('auto',b,3);
  assert.equal(low.contactShadows,false);assert.equal(low.bloom,false);assert.equal(low.shadows,false);
  assert.equal(low.pixelRatio,.6);
});

test('film pass is a self-contained linear-light effect', () => {
  const pass=createFilmGrade();assert.ok(pass.uniforms.tDiffuse);
  assert.equal(pass.enabled,true);pass.dispose();
});
