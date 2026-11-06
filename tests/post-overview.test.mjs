import test from 'node:test';
import assert from 'node:assert/strict';
import { homePostLists, overview, publicationHistory } from '../src/lib/postOverview.mjs';

test('Overview keeps drafts, failures and confirmed publications distinct without mutating input', () => {
  const time = new Date('2026-11-05T10:00:00Z');
  const posts = Object.freeze([Object.freeze({id:'draft',status:'bozza'}),Object.freeze({id:'ready',status:'pronto'}),Object.freeze({id:'queue',status:'in_coda',scheduled_at:'2026-11-06T09:00:00Z'}),Object.freeze({id:'failed',status:'fallito'}),Object.freeze({id:'uncertain',status:'da_verificare'}),Object.freeze({id:'published',status:'pubblicato'})]);
  const result=overview(posts,time);
  assert.deepEqual(result.drafts.map(p=>p.id),['draft','ready']);
  assert.deepEqual(result.attention.map(p=>p.id),['failed','uncertain']);
  assert.deepEqual(result.scheduled.map(p=>p.id),['queue']);
  assert.deepEqual(result.upcoming.map(p=>p.id),['queue']);
  assert.deepEqual(result.published.map(p=>p.id),['published']);
  assert.notEqual(result.recent,posts);
});

test('Home shows scheduled sends by their actual time and fills recents without repeating a displayed post', () => {
  const early = { id:'early', status:'in_coda', scheduled_at:'2026-11-09T11:00:00+02:00', editorial_at:'2026-12-01T18:00:00Z' };
  const later = { id:'later', status:'in_coda', scheduled_at:'2026-11-09T10:00:00Z' };
  const third = { id:'third', status:'in_coda', scheduled_at:'2026-11-10T10:00:00Z' };
  const fourth = { id:'fourth', status:'in_coda', scheduled_at:'2026-11-11T10:00:00Z' };
  const undated = { id:'missing', status:'in_coda', scheduled_at:'invalid' };
  const idea = { id:'idea', status:'bozza', editorial_at:'2026-11-07T10:00:00Z' };
  const input = [later, undated, early, third, idea, fourth].map((post, index) => ({
    ...post, updated_date:new Date(Date.UTC(2026, 10, 6, 9 - index)).toISOString(),
  }));
  const result = homePostLists(Object.freeze(input));
  assert.deepEqual(result.programmed.map(post => post.id), ['early','later','third']);
  assert.deepEqual(result.recent.map(post => post.id), ['missing','idea','fourth']);
  assert.deepEqual(homePostLists([early,later]).recent, []);
  assert.deepEqual(homePostLists([idea]).programmed, []);
});

test('Recent posts follow the last edit across time zones and fall back to creation for older records', () => {
  const posts = [
    { id:'early', updated_date:'2026-11-05T11:00:00+02:00' },
    { id:'undated' },
    { id:'last', updated_date:'2026-11-05T10:30:00Z' },
    { id:'older-record', updated_date:'invalid', created_date:'2026-11-05T10:00:00Z' },
  ];
  assert.deepEqual(homePostLists(posts).recent.map(post => post.id), ['last','older-record','early']);
});

test('Publication statistics include the chosen local days only and require confirmed dates', () => {
  const now=new Date(2026,10,5,12);
  const dated=(id, date, status='pubblicato')=>({id,published_at:date,status});
  const posts=[dated('first',new Date(2026,9,30).toISOString()),dated('today',now.toISOString()),dated('old',new Date(2026,9,29,23,59).toISOString()),dated('future',new Date(2026,10,6).toISOString()),dated('missing',undefined),dated('invalid','invalid'),dated('queued',now.toISOString(),'in_coda')];
  assert.deepEqual(publicationHistory(posts,7,now).map(p=>p.id),['first','today']);
});
