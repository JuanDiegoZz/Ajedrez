import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio, createGameSignals, readAudio, savePreference, effects } from '../src/audio.js';
const game = (extra = {}) => ({ id: 'a', revision: 0, moves: [], status: 'playing', you: 'white', ...extra });
test('preferences validate, preserve coordinates and tolerate unavailable storage', () => {
  let value = '{"coordinates":false}';
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  assert.deepEqual(readAudio(storage), { enabled: true, volume: .25 });
  savePreference({ soundEnabled: false, soundVolume: .7 }, storage);
  assert.equal(JSON.parse(value).coordinates, false);
  assert.deepEqual(readAudio(storage), { enabled: false, volume: .7 });
  value = '{"soundVolume":99}'; assert.equal(readAudio(storage).volume, 1);
  value = 'broken'; assert.equal(readAudio(storage).volume, .25);
  assert.doesNotThrow(() => savePreference({}, { getItem() { throw Error(); } }));
});
for (const [flag, expected] of [[{},'move'],[{capture:true},'capture'],[{check:true,capture:true},'check'],[{castling:true},'castle'],[{promotion:'q'},'promotion']]) {
  test(`confirmed ${expected}, HTTP/WS duplicate and baseline`, () => {
    const signals = createGameSignals();
    assert.equal(signals.snapshot(game(), true), null);
    const next = game({ revision: 1, moves: [{}], lastMove: flag });
    assert.equal(signals.snapshot(next, true), expected);
    assert.equal(signals.snapshot(game(), true), null);
    assert.equal(signals.snapshot(next, true), null);
    signals.reset(); assert.equal(signals.snapshot(next, true), null);
  });
}
test('result perspective, timeout and interruption; result takes precedence', () => {
  for (const [winner, reason, expected] of [['white','checkmate','win'],['black','timeout','loss'],[null,'stalemate','draw'],[null,'interrupted',null]]) {
    const signals = createGameSignals(); signals.snapshot(game(), true);
    const done = game({revision:1,status:'finished', result:{winner,reason},moves:[{}],lastMove:{mate:true,check:true}});
    assert.equal(signals.snapshot(done, true), expected);
    assert.equal(signals.snapshot({...done,archiveStatus:'saved'},true),null);
  }
});
test('reconnect, hidden or replaced tab, identity reset and history gap are silent', () => {
  const signals = createGameSignals(); signals.snapshot(game(),true);
  const next = game({revision:2,moves:[{},{}],lastMove:{capture:true}});
  assert.equal(signals.snapshot(next,true),null);
  assert.equal(signals.snapshot(game({revision:3,moves:[{},{},{}],lastMove:{}}),false),null);
  signals.reset(); assert.equal(signals.snapshot(next,true),null);
  assert.equal(signals.snapshot(game({id:'b',revision:1,moves:[{}]}),true),null);
});
test('low clock only on crossing, once per active turn; no load/reconnect alarm', () => {
  const s=createGameSignals(); assert.equal(s.clock(9000,true),null);
  s.clock(12000,true); assert.equal(s.clock(9990,true),'low'); assert.equal(s.clock(8000,true),null);
  s.clock(8000,false); assert.equal(s.clock(7000,true),null);
  s.clock(14000,true); assert.equal(s.clock(9990,true),'low');
});
test('audio caches loads, supports mute/volume, stops overlap and tolerates autoplay/load failure', async () => {
  let starts=0, stops=0, loads=0;
  const context={state:'suspended',currentTime:0,destination:{},resume:async()=>{context.state='running';},createGain:()=>({gain:{value:1,setTargetAtTime(){},cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),decodeAudioData:async()=>({}),createBufferSource:()=>({connect(){},disconnect(){},start(){starts++;},stop(){stops++;}})};
  const audio=createAudio(()=>context,async()=>{loads++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
  assert.equal(audio.play('move'),false); await audio.unlock(); await audio.unlock(); assert.equal(loads,effects.length);
  assert.equal(audio.play('move'),true);audio.play('capture'); assert.equal(starts,2);assert.equal(stops,1);
  audio.configure({enabled:false,volume:.25});assert.equal(audio.play('move'),false);
  audio.configure({enabled:true,volume:0});assert.equal(audio.play('move'),false);
  const broken=createAudio(()=>{throw Error('autoplay');}); await broken.unlock();assert.equal(broken.play('move'),false);
  const missing=createAudio(()=>context,async()=>{throw Error('offline');});await missing.unlock();assert.equal(missing.play('move'),false);
});

test('paused recovery and resumption establish a silent reference', () => {
  const signals=createGameSignals(); signals.snapshot(game(),true);
  const paused=game({revision:1,paused:true}); assert.equal(signals.snapshot(paused,true),null);
  assert.equal(signals.snapshot(game({revision:2}),true),null);
  assert.equal(signals.snapshot(game({revision:3,status:'finished',result:null}),true),null);
});

test('a confirmed result during recovery still sounds once to the connected player', () => {
  const signals=createGameSignals(); signals.snapshot(game({paused:true}),true);
  const finished=game({revision:1,status:'finished',result:{winner:'white',reason:'disconnect'}});
  assert.equal(signals.snapshot(finished,true),'win');
  assert.equal(signals.snapshot(finished,true),null);
});

test('suspended autoplay rejection is contained without a playback queue', async () => {
  const context={state:'suspended',createGain:()=>({gain:{value:0},connect(){}}),resume:async()=>{throw Error('NotAllowedError');}};
  const engine=createAudio(()=>context);await engine.unlock();assert.equal(engine.play('move'),false);
});

test('all shipped WAV assets have valid PCM headers, headroom and clean endpoints', () => {
  for(const name of effects) {
    const wav=readFileSync(new URL(`../public/assets/audio/${name}.wav`,import.meta.url));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
    assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),22050);assert.equal(wav.readUInt16LE(34),16);
    assert.equal(wav.readUInt32LE(40),wav.length-44);assert.equal(wav.readInt16LE(44),0);assert.equal(wav.readInt16LE(wav.length-2),0);
    let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
    assert.ok(peak<=16384&&peak>10000);assert.ok(wav.length<30000);
  }
});
