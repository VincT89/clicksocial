import test from 'node:test';
import assert from 'node:assert/strict';
import { fitLogoPlacement, validateLogoPlacement, resolveLogoAnalysis, overlapsProtectedContent } from '../src/lib/logoPlacement.js';

test('logo: conserva le proporzioni e resta nel rettangolo su formati diversi', () => {
  const placement = { x:0.6, y:0.08, width:0.26, height:0.18, background:'light' };
  for (const [w,h] of [[1024,1024],[1620,1080],[1080,1620],[320,568]]) {
    for (const [lw,lh] of [[900,150],[120,900],[400,400]]) {
      const logo = fitLogoPlacement(placement,w,h,lw,lh);
      assert.ok(Math.abs(logo.width / logo.height - lw / lh) < 1e-9);
      assert.ok(logo.x - logo.padding >= placement.x * w - 1e-9);
      assert.ok(logo.y - logo.padding >= placement.y * h - 1e-9);
      assert.ok(logo.x + logo.width + logo.padding <= (placement.x + placement.width) * w + 1e-9);
      assert.ok(logo.y + logo.height + logo.padding <= (placement.y + placement.height) * h + 1e-9);
    }
  }
});

test('logo: sposta una proposta che copre il titolo, con distanza di rispetto e senza riquadri', () => {
  const proposal={x:0.6,y:0.08,width:0.26,height:0.18,background:'none',logo_background:'black',
    protected_regions:[{x:0.55,y:0.06,width:0.4,height:0.2},{x:0.1,y:0.4,width:0.7,height:0.5}]};
  const result=resolveLogoAnalysis(proposal);
  assert.equal(overlapsProtectedContent(result,proposal.protected_regions),false);
  assert.equal(result.background,'none'); assert.equal(result.logo_background,'black');
  assert.notDeepEqual([result.x,result.y],[proposal.x,proposal.y]);
  for(const [w,h] of [[1024,1024],[320,568],[1620,1080]]) {
    const fitted=fitLogoPlacement(result,w,h,800,200);
    assert.equal(overlapsProtectedContent({x:fitted.x/w,y:fitted.y/h,width:fitted.width/w,height:fitted.height/h},proposal.protected_regions),false);
  }
});

test('logo: scarta aree non valide e grafiche interamente occupate', () => {
  const valid={x:0.6,y:0.08,width:0.26,height:0.18,background:'none',logo_background:'white',logo_background_points:[],protected_regions:[]};
  assert.deepEqual(resolveLogoAnalysis(valid),valid);
  for(const regions of [undefined,[{x:0,y:0,width:1,height:1}],[{x:0.9,y:0,width:0.3,height:0.1}],Array(65).fill({x:0,y:0,width:0.1,height:0.1})]) {
    assert.throws(()=>resolveLogoAnalysis({...valid,protected_regions:regions}));
  }
  assert.throws(()=>resolveLogoAnalysis({...valid,logo_background:'red'}));
  assert.throws(()=>resolveLogoAnalysis({...valid,logo_background_points:[{x:1.5,y:0.5}]}));
});

test('logo: rifiuta risposte incomplete, coordinate fuori grafica e dimensioni inesistenti', () => {
  const valid = {x:0.1,y:0.1,width:0.2,height:0.12,background:'none'};
  for (const bad of [null,{}, {...valid,x:NaN},{...valid,x:Infinity},{...valid,x:-0.1},{...valid,x:0.9},
    {...valid,y:0.95},{...valid,width:0.7},{...valid,height:0},{...valid,background:'red'}]) {
    assert.throws(() => validateLogoPlacement(bad));
  }
  assert.throws(() => fitLogoPlacement(valid,1024,1024,0,100));
  assert.throws(() => fitLogoPlacement(valid,NaN,1024,100,100));
  const logo = fitLogoPlacement(valid,1000,1000,200,100);
  assert.equal(logo.padding,0);
  assert.equal(logo.width,200);
  // 0.8 + 0.17 può superare 0.97 per il solo arrotondamento binario.
  assert.doesNotThrow(() => validateLogoPlacement({...valid,x:0.8,y:0.8,width:0.17,height:0.17}));
  assert.throws(() => validateLogoPlacement({...valid,x:0.80001,y:0.8,width:0.17,height:0.17}));
});
