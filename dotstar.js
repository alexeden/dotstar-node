const R = require('ramda');
const SPI = require('pi-spi');
const Osci = require('./oscillator.js');
const { TimeKeeper } = require('./mark.js');
const {
  SPI_PORT,
  // COLORS,
  FPS,
  // N: number of LEDs in the strip
  // FRAME_SIZE: frame size in bytes of each LED frame and the start and end frames
  // LED_FRAME_OFFSET: the offset in bytes of each LED frame
  DOTSTAR: { N, FRAME_SIZE, LED_FRAME_OFFSET, START_FRAME_BYTE, LED_CONTROL_BYTE, END_FRAME_BYTE, CHANNELS, CHANNEL_MIN, CHANNEL_MAX }
} = require('./config-loader.js');

const clamp = R.compose(R.min(CHANNEL_MAX), R.max(CHANNEL_MIN), parseInt);
const OsciRandomInits = () => ({ z: 255*Math.random(), v: (10000*Math.random())-5000 });

// The master time keeper
const timeKeeper = TimeKeeper(R.always(FPS));

// Number of bytes needed for a complete update signal
const startFrameSize = R.always(FRAME_SIZE);
const endFrameSize = R.always(Math.ceil(N/2));
const bufferSize = R.always(FRAME_SIZE * N + endFrameSize() + startFrameSize());


// Create an array of offsets values in bytes of each led frame in the buffer
const ledFrameOffsets = R.compose(
  R.map(R.add(R.__, startFrameSize())),
  R.map(R.multiply(FRAME_SIZE)),
  R.range(0)
);

// The raw binary buffer and terminal frames
const binaryBuffer = new ArrayBuffer(bufferSize());
const startFrame = new Uint8ClampedArray(binaryBuffer, 0, startFrameSize()).fill(START_FRAME_BYTE);
const endFrame = new Uint8ClampedArray(binaryBuffer, startFrameSize() + N*FRAME_SIZE, endFrameSize()).fill(END_FRAME_BYTE);
const buffer = new Buffer(binaryBuffer);


// Create the oscillators (but do not start them), one for each led
const oscis = R.range(0, N).map(n => Osci(n, timeKeeper));
const offsets = ledFrameOffsets(N);
const ledFrames = R.zip(oscis, offsets).map(([osci, offset]) => {
  const led = new Uint8ClampedArray(binaryBuffer, offset, FRAME_SIZE);
  led[0] = 0xFF;
  led[2] = 0xFF;
  led[3] = 0x00;
  led[1] = 0x00;
  // const OsciChannelObserver = ({x, i, z, v, a, idle}) => {
  //   // led[i + 1] = clamp(z);
  //   led[i + 1] = 0x00;
  //   // led[i + 1] = 0xFF;
  // }
  // Fire em up
  // osci(R.times(() => [OsciRandomInits(), OsciChannelObserver], CHANNELS));
  return led;
});

const spi = SPI.initialize(SPI_PORT);

function write() {
  spi.write(new Buffer(buffer), () => { });
}
// console.log(`first buffer: `, new Buffer(buffer));
// console.log(`ledFrames: `, ledFrames);
setInterval(write, 1);
