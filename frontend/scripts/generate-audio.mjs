// Procedural assets for Ajedrez. Proposed CC0 dedication: see assets/audio/CREDITS.md. No third-party samples.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../public/assets/audio/', import.meta.url));
mkdirSync(directory, { recursive: true });
const rate = 22050;
const catalog = {
  move: [[0, 240, .16]], capture: [[0, 185, .2], [.045, 370, .14]],
  castle: [[0, 240, .14], [.1, 300, .16]], check: [[0, 660, .16], [.12, 740, .16]],
  promotion: [[0, 392, .2], [.12, 523.25, .25], [.24, 659.25, .25]],
  win: [[0, 392, .24], [.14, 493.88, .24], [.28, 587.33, .34]],
  loss: [[0, 392, .24], [.16, 329.63, .24], [.32, 261.63, .34]],
  draw: [[0, 392, .28], [.18, 440, .3]], low: [[0, 523.25, .14], [.19, 523.25, .14]],
};
for (const [name, notes] of Object.entries(catalog)) {
  const length = Math.ceil(Math.max(...notes.map(([at, , duration]) => at + duration)) * rate);
  const samples = new Float64Array(length);
  for (const [at, frequency, duration] of notes) {
    for (let i = 0; i < duration * rate; i++) {
      const t = i / rate, index = Math.floor(at * rate) + i;
      if (index >= length) break;
      const envelope = Math.min(1, t / .004) * Math.pow(1 - t / duration, 3);
      const body = Math.sin(2 * Math.PI * frequency * t) + .24 * Math.sin(2 * Math.PI * frequency * 2.71 * t);
      samples[index] += body * envelope;
    }
  }
  // Uniform peak headroom and explicit zero tails avoid clipping and clicks.
  const peak = Math.max(...samples.map(Math.abs));
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  samples.forEach((sample, i) => wav.writeInt16LE(Math.round(sample / peak * 16383), 44 + i * 2));
  writeFileSync(`${directory}/${name}.wav`, wav);
  console.log(`${name}: ${(length / rate).toFixed(3)} s, ${wav.length} bytes`);
}
