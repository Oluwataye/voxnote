
import { AudioRecorder } from "./AudioRecorder";
import { MicrophoneManager } from "./MicrophoneManager";
import { OpenAIClient } from "./OpenAIClient";
import { WebRTCManager } from "./WebRTCManager";
import { RealtimeEvent } from "./types";

export class RealtimeChat {
  private readonly SAMPLE_RATE = 24000;
  private webRTC: WebRTCManager;
  private micManager: MicrophoneManager;
  private apiClient: OpenAIClient;
  private recorder: AudioRecorder | null = null;
  private isPaused: boolean = false;

  constructor(private onMessage: (message: RealtimeEvent) => void) {
    this.webRTC = new WebRTCManager(this.onMessage, this.SAMPLE_RATE);
    this.micManager = new MicrophoneManager();
    this.apiClient = new OpenAIClient();
  }

  async init() {
    try {
      // Get ephemeral token for OpenAI
      const { token, model } = await this.apiClient.getEphemeralToken();

      // Request microphone permission
      const microphoneStream = await this.micManager.requestMicrophonePermission({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up WebRTC connection
      await this.webRTC.setupConnection(token, model);
      
      // Add tracks to the peer connection
      this.webRTC.addTracks(microphoneStream);

      // Set up audio recorder
      this.recorder = new AudioRecorder((audioData) => {
        this.webRTC.sendAudioBuffer(audioData, this.isPaused);
      });
      
      await this.recorder.start();
      console.log("Audio recorder started");

    } catch (error) {
      console.error("Error initializing chat:", error);
      this.cleanup();
      throw error;
    }
  }

  private cleanup() {
    this.micManager.cleanup();
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
    this.recorder?.stop();
    this.cleanup();
    this.webRTC.close();
    console.log("Chat disconnected and resources cleaned up");
  }
}
