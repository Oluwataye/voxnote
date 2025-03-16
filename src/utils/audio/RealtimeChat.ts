
import { AudioRecorder } from "./AudioRecorder";
import { MicrophoneManager } from "./MicrophoneManager";
import { OpenAIClient } from "./OpenAIClient";
import { WebRTCManagerFacade } from "./rtc";
import { RealtimeEvent } from "./types";

export class RealtimeChat {
  private readonly SAMPLE_RATE = 24000;
  private webRTC: WebRTCManagerFacade;
  private micManager: MicrophoneManager;
  private apiClient: OpenAIClient;
  private recorder: AudioRecorder | null = null;
  private isPaused: boolean = false;

  constructor(private onMessage: (message: RealtimeEvent) => void) {
    this.webRTC = new WebRTCManagerFacade(this.onMessage, this.SAMPLE_RATE);
    this.micManager = new MicrophoneManager();
    this.apiClient = new OpenAIClient();
  }

  async init() {
    try {
      // Get ephemeral token for OpenAI
      const { token, model } = await this.apiClient.getEphemeralToken();
      console.log("Got token and model:", model);

      // Request microphone permission first to ensure we have access before setting up WebRTC
      const microphoneStream = await this.micManager.requestMicrophonePermission({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Ensure we have valid audio tracks before proceeding
      const audioTracks = microphoneStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('No audio tracks found in the microphone stream');
      }
      
      console.log(`Found ${audioTracks.length} audio tracks, adding to WebRTC`);
      
      // Add tracks to the peer connection BEFORE setting up the connection
      this.webRTC.addTracks(microphoneStream);
      
      // Then set up WebRTC connection
      await this.webRTC.setupConnection(token, model);
      
      // Set up audio recorder
      this.recorder = new AudioRecorder((audioData) => {
        this.webRTC.sendAudioBuffer(audioData, this.isPaused);
      });
      
      await this.recorder.initialize();
      await this.recorder.start();
      console.log("Audio recorder started successfully");

    } catch (error) {
      console.error("Error initializing chat:", error);
      this.cleanup();
      throw error;
    }
  }

  private cleanup() {
    this.micManager.cleanup();
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  async sendMessage(text: string) {
    this.webRTC.sendMessage(text);
  }

  pause() {
    this.webRTC.pauseAudio();
    this.isPaused = true;
  }

  resume() {
    this.webRTC.resumeAudio();
    this.isPaused = false;
  }

  isConnected() {
    return this.webRTC.isConnected();
  }

  disconnect() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    this.cleanup();
    this.webRTC.close();
    console.log("Chat disconnected and resources cleaned up");
  }
}
