
import { RealtimeEvent } from "../types";

export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;

  constructor(private onMessage: (message: RealtimeEvent) => void) {}

  createDataChannel(peerConnection: RTCPeerConnection, label: string = "text"): RTCDataChannel {
    this.dataChannel = peerConnection.createDataChannel(label);
    this.setupDataChannel();
    return this.dataChannel;
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };

    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
    };
  }

  sendAudioBuffer(audioData: Float32Array, isPaused: boolean): void {
    if (isPaused) return;

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

  isOpen(): boolean {
    return this.dataChannel?.readyState === "open";
  }

  cleanup(): void {
    this.dataChannel = null;
  }
}
