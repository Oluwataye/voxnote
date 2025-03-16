
import { RealtimeEvent } from "../types";
import { ConnectionManager } from "./ConnectionManager";
import { DataChannelManager } from "./DataChannelManager";
import { MediaManager } from "./MediaManager";

export class WebRTCManagerFacade {
  private connectionManager: ConnectionManager;
  private dataChannelManager: DataChannelManager;
  private mediaManager: MediaManager;
  private isConnectionEstablished: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 2;

  constructor(private onMessage: (message: RealtimeEvent) => void, private sampleRate: number = 24000) {
    this.dataChannelManager = new DataChannelManager(this.onMessage);
    this.mediaManager = new MediaManager();
    this.connectionManager = new ConnectionManager(
      this.handleIceCandidate.bind(this),
      this.handleConnectionStateChange.bind(this),
      this.handleTrack.bind(this)
    );
  }

  private handleIceCandidate(candidate: RTCIceCandidate | null): void {
    if (candidate) {
      console.log("ICE candidate:", candidate);
    }
  }

  private handleConnectionStateChange(state: RTCIceConnectionState): void {
    console.log("ICE connection state:", state);
  }

  private handleTrack(event: RTCTrackEvent): void {
    console.log("Received track:", event.track.kind);
  }

  addTracks(stream: MediaStream): void {
    const peerConnection = this.connectionManager.getPeerConnection() || 
                           this.connectionManager.createPeerConnection();
    this.mediaManager.addTracksToConnection(stream, peerConnection);
  }

  async setupConnection(token: string, model: string): Promise<void> {
    try {
      // Reset retry count on new setup attempt
      this.retryCount = 0;
      
      // Make sure we have a peer connection
      const peerConnection = this.connectionManager.getPeerConnection() || 
                             this.connectionManager.createPeerConnection();
      
      // Check for audio tracks before proceeding
      if (!this.mediaManager.hasAudioTracks()) {
        throw new Error("No audio tracks have been added. Call addTracks() first.");
      }

      console.log(`Using model: ${model}`);

      // Create data channel for text
      this.dataChannelManager.createDataChannel(peerConnection);

      await this.attemptConnection(token, model);
      
      console.log("WebRTC connection established successfully");
      this.isConnectionEstablished = true;
    } catch (error) {
      console.error("Error setting up WebRTC connection:", error);
      throw error;
    }
  }

  private async attemptConnection(token: string, model: string, isRetry: boolean = false): Promise<void> {
    try {
      // Create offer with audio
      const offer = await this.connectionManager.createOffer();
      
      // Set local description first
      await this.connectionManager.setLocalDescription(offer);
      
      // Send offer to OpenAI
      const response = await fetch("https://api.openai.com/v1/audio/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: "webrtc" },
          webrtc: { offer: offer.sdp },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        console.error("SDP response error:", JSON.stringify(error));
        
        // If we get a specific token error, we should not retry
        if (error.error?.code === "invalid_api_key" || 
            error.error?.message?.includes("key") || 
            error.error?.message?.includes("token") ||
            response.status === 401) {
          throw new Error(`Authentication error: Invalid or expired API key. Please try again.`);
        }
        
        throw new Error(`API error: ${error.error?.message || 'Failed to connect to OpenAI'}`);
      }

      const data = await response.json();

      // Set remote description from OpenAI
      await this.connectionManager.setRemoteDescription({
        type: "answer",
        sdp: data.webrtc.answer,
      });
    } catch (error) {
      if (isRetry || this.retryCount >= this.maxRetries) {
        throw error;
      }
      
      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.log(`Connection attempt failed, retrying (${this.retryCount + 1}/${this.maxRetries})...`);
        this.retryCount++;
        
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.attemptConnection(token, model, true);
      }
      
      throw error;
    }
  }

  sendAudioBuffer(audioData: Float32Array, isPaused: boolean): void {
    // Use isPaused from both the local state and the parameter
    if (this.mediaManager.getAudioPauseState() || isPaused) return;

    this.dataChannelManager.sendAudioBuffer(audioData, false);
  }

  sendMessage(text: string): void {
    this.dataChannelManager.sendMessage(text);
  }

  pauseAudio(): void {
    this.mediaManager.pauseAudio();
  }

  resumeAudio(): void {
    this.mediaManager.resumeAudio();
  }

  isConnected(): boolean {
    return this.isConnectionEstablished;
  }

  close(): void {
    this.connectionManager.close();
    this.dataChannelManager.cleanup();
    this.mediaManager.cleanup();
    this.isConnectionEstablished = false;
    console.log("WebRTC connection closed");
  }
}
