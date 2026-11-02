import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverySeconds, playerPresence, outcome } from '../src/presence.js';

test('recovery countdown derives only from authoritative sample and deadline', () => {
  const presence={status:'disconnected',reconnectUntil:13000};
  assert.equal(recoverySeconds(presence,10000,500),3);
  assert.equal(recoverySeconds(presence,10000,5000),0);
  assert.equal(recoverySeconds(presence,undefined,0),null);
  assert.equal(recoverySeconds({status:'connected'},10000,0),null);
  assert.equal(recoverySeconds({...presence,reconnectUntil:NaN},10000,0),null);
});
test('socket replacement and local absence never claim opponent is disconnected', () => {
  const g={status:'playing',you:'white',mode:'human',presence:{black:{status:'connected'}}};
  assert.equal(playerPresence(g,'black','disconnected'),'Estado sin actualizar');
  assert.equal(playerPresence(g,'white','replaced'),'Control en otra pestaña');
  assert.equal(playerPresence(g,'black','connected'),'Conectado');
  assert.equal(playerPresence({...g,presence:{black:{status:'disconnected'}}},'black','connected'),'Recuperando conexión');
  assert.equal(playerPresence({...g,status:'finished'},'black','connected'),'Partida finalizada');
});
test('result identity uses local color rather than repeated player names', () => {
  const g={you:'black',white:{name:'Alex'},black:{name:'Alex'}};
  assert.equal(outcome({...g,result:{winner:'black',reason:'timeout'}}).key,'win');
  assert.equal(outcome({...g,result:{winner:'white',reason:'resignation'}}).key,'loss');
  assert.equal(outcome({...g,result:{winner:null,reason:'stalemate'}}).key,'draw');
  assert.equal(outcome({...g,result:{winner:null,reason:'interrupted'}}).key,'neutral');
  assert.equal(outcome(g).title,'Resultado pendiente');
});
