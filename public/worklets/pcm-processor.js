/**
 * AudioWorkletProcessor for streaming PCM audio capture.
 * Posts raw Float32 audio channel buffer to main thread for 16kHz resampling and PCM16 packaging.
 */
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Pass audio slice to main thread
      this.port.postMessage(input[0]);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
