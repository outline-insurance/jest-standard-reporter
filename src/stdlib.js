const { clearLine } = require('jest-util');

class Stdlib {
  constructor(globalConfig) {
    this.out = process.stdout.write.bind(process.stdout);
    this.err = process.stderr.write.bind(process.stderr);
    this.useStderr = globalConfig.useStderr;
    this.bufferedOutput = new Set();
    this.log = log.bind(this);
    this.error = error.bind(this);
    this.clear = clear.bind(this);
    this.close = close.bind(this);
    this.forceFlushBufferedOutput = forceFlushBufferedOutput.bind(this);
    this.wrapStdio = wrapStdio.bind(this);
    this.wrapStdio(process.stdout);
    this.wrapStdio(process.stderr);
  }
}

function log(message) {
  if (this.useStderr) {
    this.err(`${message}\n`);
  } else {
    this.out(`${message}\n`);
  }
}

function error(message) {
  this.err(`${message}\n`);
}

function clear() {
  clearLine(process.stdout);
  clearLine(process.stderr);
}

function close() {
  this.forceFlushBufferedOutput();
  process.stdout.write = this.out;
  process.stderr.write = this.err;
}

// Don't wait for the debounced call and flush all output immediately.
function forceFlushBufferedOutput() {
  for (const flushBufferedOutput of this.bufferedOutput) {
    flushBufferedOutput();
  }
}

function wrapStdio(stream) {
  const originalWrite = stream.write;

  let buffer = [];
  let timeout = null;

  const flushBufferedOutput = () => {
    const string = buffer.join('');
    buffer = [];

    if (string) {
      originalWrite.call(stream, string);
    }

    this.bufferedOutput.delete(flushBufferedOutput);
  };

  this.bufferedOutput.add(flushBufferedOutput);

  const debouncedFlush = () => {
    // If the process blows up no errors would be printed.
    // There should be a smart way to buffer stderr, but for now
    // we just won't buffer it.
    if (stream === process.stderr || stream === process.stdout) {
      flushBufferedOutput();
    } else {
      if (!timeout) {
        timeout = setTimeout(() => {
          flushBufferedOutput();
          timeout = null;
        }, 100);
      }
    }
  };

  stream.write = chunk => {
    buffer.push(chunk);
    debouncedFlush();

    return true;
  };
}

module.exports = Stdlib;
