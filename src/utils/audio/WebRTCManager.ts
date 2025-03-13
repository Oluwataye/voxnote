import { RealtimeEvent } from "./types";

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioSender: RTCRtpSender | null = null;
  private isAudioPaused: boolean = false;
  private isConnectionEstablished: boolean = false;
  private mediaStream: MediaStream | null = null;

  constructor(
    private onMessage: (message: RealtimeEvent) => void,
    private sampleRate: number = 24000
  ) {}

  /**
   * Add media stream tracks to the peer connection
   * This must be called BEFORE setupConnection
   */
  addTracks(stream: MediaStream): void {
    try {
      if (!stream) {
        console.error("Cannot add tracks: No stream provided");
        return;
      }

      this.mediaStream = stream;
      
      // Create peer connection if it doesn't exist
      if (!this.peerConnection) {
        this.createPeerConnection();
      }
      
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error("No audio tracks found in the stream");
      }
      
      console.log(`Adding ${audioTracks.length} audio tracks to peer connection`);
      
      // Add each audio track to the peer connection
      for (const track of audioTracks) {
        // Make sure track is enabled
        if (!track.enabled) {
          track.enabled = true;
          console.log(`Enabled track: ${track.label}`);
        }
        
        this.audioSender = this.peerConnection.addTrack(track, stream);
        console.log(`Added track: ${track.kind} (${track.label})`);
      }
      
    } catch (error) {
      console.error("Error adding tracks to peer connection:", error);
      throw error;
    }
  }

  /**
   * Create the peer connection with appropriate configuration
   */
  private createPeerConnection(): void {
    try {
      // Create peer connection with ICE servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        // Add DSCP to prioritize audio packets
        sdpSemantics: "unified-plan",
      });

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("ICE candidate:", event.candidate);
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", this.peerConnection?.iceConnectionState);
      };

      this.peerConnection.ontrack = (event) => {
        console.log("Received track:", event.track.kind);
      };
      
      console.log("Peer connection created successfully");
    } catch (error) {
      console.error("Error creating peer connection:", error);
      throw error;
    }
  }

  /**
   * Set up the WebRTC connection with OpenAI
   * This must be called AFTER addTracks
   */
  async setupConnection(token: string, model: string): Promise<void> {
    try {
      // Make sure we have tracks added first
      if (!this.peerConnection) {
        this.createPeerConnection();
        console.warn("No peer connection found, created a new one");
      }
      
      // Check for audio tracks before proceeding
      if (!this.audioSender) {
        throw new Error("No audio tracks have been added. Call addTracks() first.");
      }

      console.log(`Using model: ${model}`);

      // Create data channel for text
      this.dataChannel = this.peerConnection.createDataChannel("text");
      this.setupDataChannel();

      // Create offer with audio
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      // Log SDP for debugging
      console.log("Created offer SDP:", offer.sdp?.substring(0, 100) + "...");
      
      // Check if offer includes audio section
      if (!offer.sdp?.includes("m=audio")) {
        throw new Error("Generated offer does not contain audio media section");
      }

      // Set local description first
      await this.peerConnection.setLocalDescription(offer);
      
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
        const error = await response.json();
        console.error("SDP response error:", JSON.stringify(error));
        throw new Error(`Failed to establish connection: ${JSON.stringify(error)}`);
      }

      const data = await response.json();

      // Set remote description from OpenAI
      await this.peerConnection.setRemoteDescription({
        type: "answer",
        sdp: data.webrtc.answer,
      });

      console.log("WebRTC connection established successfully");
      this.isConnectionEstablished = true;
    } catch (error) {
      console.error("Error setting up WebRTC connection:", error);
      throw error;
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.onMessage(message);
    };

    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
    };
  }

  sendAudioBuffer(audioData: Float32Array, isPaused: boolean): void {
    if (this.isAudioPaused || isPaused) return;

    // Send audio data over the data channel
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify({ audioData }));
    }
  }

  sendMessage(text: string): void {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify({ text }));
    }
  }

  pauseAudio(): void {
    this.isAudioPaused = true;
  }

  resumeAudio(): void {
    this.isAudioPaused = false;
  }

  isConnected(): boolean {
    return this.isConnectionEstablished;
  }

  close(): void {
    this.peerConnection?.close();
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioSender = null;
    this.isConnectionEstablished = false;
    console.log("WebRTC connection closed");
  }
}
