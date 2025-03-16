
import { RTCConnectionState } from '../types';

export class ConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  
  constructor(
    private onIceCandidateCallback: (candidate: RTCIceCandidate | null) => void,
    private onConnectionStateChangeCallback: (state: RTCConnectionState) => void,
    private onTrackCallback: (event: RTCTrackEvent) => void
  ) {}

  createPeerConnection(): RTCPeerConnection {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        this.onIceCandidateCallback(event.candidate);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        this.onConnectionStateChangeCallback(this.peerConnection?.iceConnectionState as RTCConnectionState);
      };

      this.peerConnection.ontrack = (event) => {
        this.onTrackCallback(event);
      };
      
      console.log("Peer connection created successfully");
      return this.peerConnection;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      throw error;
    }
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Cannot create offer: No peer connection exists");
    }
    
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      console.log("Created offer SDP:", offer.sdp?.substring(0, 100) + "...");
      
      // Check if offer includes audio section
      if (!offer.sdp?.includes("m=audio")) {
        throw new Error("Generated offer does not contain audio media section");
      }
      
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Cannot set local description: No peer connection exists");
    }
    
    try {
      await this.peerConnection.setLocalDescription(description);
    } catch (error) {
      console.error("Error setting local description:", error);
      throw error;
    }
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Cannot set remote description: No peer connection exists");
    }
    
    try {
      await this.peerConnection.setRemoteDescription(description);
    } catch (error) {
      console.error("Error setting remote description:", error);
      throw error;
    }
  }

  close(): void {
    this.peerConnection?.close();
    this.peerConnection = null;
  }
}
