
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
  private isInitializing: boolean = false;

  constructor(private onMessage: (message: RealtimeEvent) => void) {
    this.webRTC = new WebRTCManagerFacade(this.onMessage, this.SAMPLE_RATE);
    this.micManager = new MicrophoneManager();
    this.apiClient = new OpenAIClient();
  }

  async init() {
    if (this.isInitializing) {
      console.log("Already initializing chat session, please wait...");
      return;
    }
    
    this.isInitializing = true;
    let microphoneStream: MediaStream | null = null;
    
    try {
      // Get ephemeral token for OpenAI
      const { token, model } = await this.apiClient.getEphemeralToken();
      console.log("Got token and model:", model);
      
      if (!token) {
        throw new Error("Failed to obtain API token. Please check your network connection and try again.");
      }

      // Request microphone permission first to ensure we have access before setting up WebRTC
      microphoneStream = await this.micManager.requestMicrophonePermission({
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
      // Clean up resources on error
      if (microphoneStream) {
        this.micManager.cleanup();
      }
      
      if (this.recorder) {
        this.recorder.stop();
        this.recorder = null;
      }
      
      console.error("Error initializing chat:", error);
      
      // Translate technical errors into user-friendly messages
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network connection error. Please check your internet connection and try again.");
      } else if (error instanceof Error && error.message.includes("API key")) {
        throw new Error("Authentication error. Please sign out and sign in again.");
      }
      
      // Rethrow original error or enhanced message
      throw error;
    } finally {
      this.isInitializing = false;
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
    try {
      this.webRTC.sendMessage(text);
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to send message. The connection may have been lost.");
    }
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
