
/**
 * AudioRecorder handles microphone access and processes audio data for transcription
 */
export class AudioRecorder {
  // Audio processing state
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Status tracking
  private isRecording: boolean = false;
  private isInitialized: boolean = false;
  private hasPermission: boolean = false;
  
  // Optimal audio settings for voice clarity
  private readonly SAMPLE_RATE = 24000;
  private readonly BUFFER_SIZE = 4096;
  private readonly CHANNELS = 1;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  /**
   * Initializes audio context and requests microphone permissions
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('AudioRecorder already initialized');
      return true;
    }

    try {
      // Create audio context optimized for voice
      this.audioContext = new AudioContext({
        sampleRate: this.SAMPLE_RATE,
      });
      
      // Request microphone access with optimal settings
      const stream = await this.requestMicrophoneAccess();
      if (!stream) {
        return false;
      }
      
      this.stream = stream;
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.handleError('Failed to initialize AudioRecorder', error);
      return false;
    }
  }

  /**
   * Requests microphone access with optimal settings for voice clarity
   */
  private async requestMicrophoneAccess(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: this.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Verify we have audio tracks and they're enabled
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track found in the stream');
      }
      
      if (!audioTrack.enabled) {
        audioTrack.enabled = true;
        if (!audioTrack.enabled) {
          throw new Error('Could not enable audio track');
        }
      }
      
      console.log(`Using microphone: ${audioTrack.label}`);
      this.hasPermission = true;
      return stream;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          this.handleError('Microphone access denied by user', error);
        } else if (error.name === 'NotFoundError') {
          this.handleError('No microphone found on this device', error);
        } else if (error.name === 'NotReadableError') {
          this.handleError('Cannot access microphone (may be in use by another application)', error);
        } else {
          this.handleError('Error accessing microphone', error);
        }
      } else {
        this.handleError('Unexpected error accessing microphone', error);
      }
      this.hasPermission = false;
      return null;
    }
  }

  /**
   * Sets up and connects the audio processing pipeline
   */
  private setupAudioProcessing(): boolean {
    if (!this.audioContext || !this.stream) {
      console.error('Cannot set up audio processing: AudioContext or stream not initialized');
      return false;
    }
    
    try {
      // Create media stream source
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create processor with optimal buffer size for voice
      this.processor = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, this.CHANNELS, this.CHANNELS);
      this.processor.onaudioprocess = this.handleAudioProcess.bind(this);
      
      // Connect the audio processing graph
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Audio processor connected and ready');
      return true;
    } catch (error) {
      this.handleError('Failed to set up audio processing', error);
      return false;
    }
  }

  /**
   * Audio processing event handler
   */
  private handleAudioProcess(event: AudioProcessingEvent): void {
    // Only process audio if we're recording
    if (!this.isRecording) return;
    
    const inputData = event.inputBuffer.getChannelData(0);
    // Create a copy of the data to avoid reference issues
    const audioData = new Float32Array(inputData);
    this.onAudioData(audioData);
  }

  /**
   * Starts recording audio
   */
  async start(): Promise<boolean> {
    if (this.isRecording) {
      console.log('Already recording');
      return true;
    }

    // Initialize if not already initialized
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }
    
    // Set up audio processing if not already set up
    if (!this.source || !this.processor) {
      const setupSuccess = this.setupAudioProcessing();
      if (!setupSuccess) return false;
    }
    
    this.isRecording = true;
    console.log('Audio recording started');
    return true;
  }

  /**
   * Stops recording and cleans up resources
   */
  stop(): void {
    this.isRecording = false;
    this.cleanupResources();
  }
  
  /**
   * Releases all audio resources
   */
  private cleanupResources(): void {
    // Disconnect nodes
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    // Stop all media tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped audio track: ${track.label}`);
      });
      this.stream = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.error('Error closing AudioContext:', error);
      });
      this.audioContext = null;
    }
    
    this.isInitialized = false;
    console.log('Audio recorder stopped and resources cleaned up');
  }
  
  /**
   * Standardized error handler
   */
  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${message}: ${errorMessage}`, error);
  }
  
  /**
   * Returns whether the recorder is currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }
  
  /**
   * Returns whether the recorder has been granted microphone permission
   */
  hasPermissionGranted(): boolean {
    return this.hasPermission;
  }
  
  /**
   * Returns whether the recorder has been successfully initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
