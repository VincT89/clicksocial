import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dayKey, localDateTime, toInstant, monthDays, moveMonth, editorialDate, editorialStage } from '../src/lib/editorialDates.mjs';
import { createCameraSession, cameraError } from '../src/lib/camera.mjs';
import { instant, planPost } from '../server/editorial.mjs';
import { postDownload, crc32 } from '../server/zip.mjs';

test('calendario: settimana da lunedì, mesi e anni senza slittamenti', () => {
  const days = monthDays(new Date(2026,8,1,12));
  assert.equal(days.length,42); assert.equal(days[0].getDay(),1);
  assert.equal(dayKey(days[0]),'2026-08-31'); assert.equal(dayKey(days.at(-1)),'2026-10-11');
  assert.equal(dayKey(moveMonth(new Date(2026,0,31),1)),'2026-02-01');
  assert.equal(dayKey(moveMonth(new Date(2026,0,31),-1)),'2025-12-01');
  assert.equal(monthDays(new Date(2024,1,1)).filter(d => d.getMonth() === 1).length,29);
});
test('date locali: conversione reversibile e rifiuto di date inesistenti', () => {
  assert.equal(localDateTime(new Date(2026,8,9,9,30)),'2026-09-09T09:30');
  const date = toInstant('2026-09-09T09:30');
  assert.equal(localDateTime(date),'2026-09-09T09:30');
  assert.equal(toInstant('2026-02-31T09:30'),null);
  assert.equal(toInstant('2026-09-09'),null); assert.equal(toInstant('invalid'),null);
  assert.throws(() => instant('2026-02-31T09:30:00.000Z'), /Data non valida/);
  assert.throws(() => instant(0), /Data non valida/);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Rome') {
    assert.equal(toInstant('2026-03-29T02:30'),null);
    assert.equal(toInstant('2026-03-29T03:30'),'2026-03-29T01:30:00.000Z');
  }
});
test('piano editoriale distinto dalla coda di pubblicazione', () => {
  const data = planPost({status:'pronto'}, {editorial_at:'2026-09-10T08:00:00.000Z',editorial_notes:'  Revisione  '});
  assert.equal(data.status,'pronto'); assert.equal(data.scheduled_at,undefined);
  assert.equal(editorialStage(data),'pianificato'); assert.equal(data.editorial_notes,'Revisione');
  assert.equal(editorialDate(data),'2026-09-10T08:00:00.000Z');
  assert.throws(() => planPost(data,{status:'pubblicato'}));
  planPost(data,{editorial_at:null}); assert.equal(editorialStage(data),'pronto');
  assert.equal(editorialDate({scheduled_at:'2026-09-10T08:00:00.000Z'}),'2026-09-10T08:00:00.000Z');
});
test('fotocamera: una richiesta tardiva viene chiusa senza lasciare tracce attive', async () => {
  let resolveRequest, stops=0, requested;
  const session = createCameraSession({getUserMedia:options => { requested=options; return new Promise(resolve => {resolveRequest=resolve;}); }});
  const pending=session.start();
  session.stop();
  resolveRequest({getTracks:()=>[{stop:()=>stops++},{stop:()=>stops++}]});
  assert.equal(await pending,null); assert.equal(stops,2);
  assert.equal(requested.audio,false); assert.equal(requested.video.facingMode.ideal,'environment');
});
test('fotocamera: cambio obiettivo e chiusura spengono lo stream precedente', async () => {
  let stops=0;
  const session=createCameraSession({getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})});
  assert.ok(await session.start()); assert.ok(await session.start('user'));
  assert.equal(stops,1); session.stop(); session.stop(); assert.equal(stops,2);
  assert.match(cameraError({name:'NotAllowedError'}),/negato/);
  assert.match(cameraError({name:'NotFoundError'}),/Nessuna fotocamera/);
});
test('download: ZIP binario, nomi sicuri e testo UTF-8', () => {
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=','base64');
  const archive=postDownload({title:'../Caffè "test"',headline:'Caffè',caption:'È un contenuto di collaudo.',hashtags:'#test'}, {mime:'image/png',bytes:png});
  assert.equal(archive.name,'caffe-test.zip'); assert.equal(archive.bytes.readUInt32LE(0),0x04034b50);
  assert.equal(archive.bytes.readUInt16LE(archive.bytes.length-12),2);
  mkdirSync('work/tests',{recursive:true});
  writeFileSync('work/tests/editorial-download.zip',archive.bytes);
});

