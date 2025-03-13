
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioProcessor: any = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      // Request microphone access with optimal settings for voice clarity
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Check if we successfully got audio tracks
      const audioTrack = this.stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error('Could not enable audio track');
      }
      
      // Create audio context optimized for voice
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Modern browsers support AudioWorklet, but fall back to ScriptProcessor
      if (this.audioContext.audioWorklet) {
        try {
          // Try to use AudioWorklet for better performance
          await this.setupAudioWorklet();
        } catch (error) {
          console.warn('AudioWorklet not available, falling back to ScriptProcessor', error);
          this.setupScriptProcessor();
        }
      } else {
        this.setupScriptProcessor();
      }
      
      // Track successful initialization
      console.log('Audio recorder initialized successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
  
  private setupScriptProcessor() {
    if (!this.audioContext || !this.source) return;
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.onAudioData(new Float32Array(inputData));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }
  
  private async setupAudioWorklet() {
    // This is a fallback option for future implementation
    // For now, we'll just use ScriptProcessor
    this.setupScriptProcessor();
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped audio track: ${track.label}`);
      });
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('Audio recorder stopped and cleaned up');
  }
}
