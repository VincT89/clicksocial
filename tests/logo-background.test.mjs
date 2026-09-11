import test from 'node:test';
import assert from 'node:assert/strict';
import { removeLogoBackground } from '../src/lib/logoBackground.js';

function fixture(background, foreground) {
  const width=16, height=16, pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) pixels.set(x>=4 && x<=11 && y>=4 && y<=11 ? foreground : background,(y*width+x)*4);
  return {width,height,pixels};
}
test('logo: scontorna fondi bianchi e neri conservando colore, opacità e dettagli interni',()=>{
  for(const background of [[255,255,255,255],[0,0,0,255],[243,243,243,255],[12,12,12,255]]) {
    const f=fixture(background,[145,35,210,255]);
    f.pixels.set(background,(8*16+8)*4);
    const result=removeLogoBackground(f.pixels,f.width,f.height);
    assert.equal(result.removedPixels,192);
    assert.equal(f.pixels[3],0);
    assert.deepEqual(Array.from(f.pixels.slice((5*16+5)*4,(5*16+5)*4+4)),[145,35,210,255]);
    assert.deepEqual(Array.from(f.pixels.slice((8*16+8)*4,(8*16+8)*4+4)),background);
  }
});
test('logo: conserva file trasparenti e sfondi colorati, senza scambiare il marchio per il fondo',()=>{
  for(const background of [[0,0,0,0],[20,90,180,255]]) {
    const f=fixture(background,[255,255,255,255]), original=new Uint8ClampedArray(f.pixels);
    assert.equal(removeLogoBackground(f.pixels,f.width,f.height).removedPixels,0);
    assert.deepEqual(f.pixels,original);
  }
  const f=fixture([255,255,255,255],[0,0,0,255]), original=new Uint8ClampedArray(f.pixels);
  assert.equal(removeLogoBackground(f.pixels,f.width,f.height,'none').removedPixels,0);
  assert.deepEqual(f.pixels,original);
});
test('logo: svuota solo gli spazi interni identificati dall’analisi, conservando gli altri dettagli',()=>{
  const f=fixture([255,255,255,255],[100,35,180,255]);
  const hole=(8*16+8)*4, detail=(5*16+5)*4;
  f.pixels.set([255,255,255,255],hole); f.pixels.set([255,255,255,255],detail);
  removeLogoBackground(f.pixels,f.width,f.height,'white',[{x:8/15,y:8/15},{x:0.4,y:0.4}]);
  assert.equal(f.pixels[hole+3],0); assert.equal(f.pixels[detail+3],255);
  assert.deepEqual(Array.from(f.pixels.slice((6*16+6)*4,(6*16+6)*4+4)),[100,35,180,255]);
});
test('logo: elimina gli aloni del bordo antialias e rifiuta dati incompleti',()=>{
  for(const [background,foreground,edge] of [[[255,255,255,255],[0,0,0,255],[180,180,180,255]],[[0,0,0,255],[255,255,255,255],[75,75,75,255]]]) {
    const f=fixture(background,foreground), offset=(4*16+6)*4;
    f.pixels.set(edge,offset);
    removeLogoBackground(f.pixels,f.width,f.height);
    assert.deepEqual(Array.from(f.pixels.slice(offset,offset+3)),foreground.slice(0,3));
    assert.equal(f.pixels[offset+3],75);
  }
  assert.throws(()=>removeLogoBackground(new Uint8ClampedArray(3),1,1));
  assert.throws(()=>removeLogoBackground(new Uint8ClampedArray(4),1,1,'red'));
});
