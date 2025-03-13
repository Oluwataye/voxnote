
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioProcessor: any = null;
  private isRecording: boolean = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    if (this.isRecording) {
      console.log('Already recording');
      return;
    }

    try {
      this.isRecording = true;
      
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
      
      // Additional log to check what microphone we're using
      console.log(`Using microphone: ${audioTrack.label}`);
      
      // Create audio context optimized for voice
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // We'll always use ScriptProcessor for better compatibility
      this.setupScriptProcessor();
      
      // Track successful initialization
      console.log('Audio recorder initialized successfully');
    } catch (error) {
      this.isRecording = false;
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
  
  private setupScriptProcessor() {
    if (!this.audioContext || !this.source) return;
    
    // Create processor with optimal buffer size for voice
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      // Only process audio if we're recording
      if (!this.isRecording) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      // Create a copy of the data to avoid reference issues
      const audioData = new Float32Array(inputData);
      this.onAudioData(audioData);
    };
    
    // Connect the audio processing graph
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    console.log('Audio processor connected and ready');
  }

  stop() {
    this.isRecording = false;
    
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
  
  isActive(): boolean {
    return this.isRecording;
  }
}
