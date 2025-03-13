
import { encodeAudioData } from "./audioUtils";
import { RealtimeEvent } from "./types";

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private audioContext: AudioContext;
  private connectionActive: boolean = false;
  
  constructor(
    private readonly onMessage: (message: RealtimeEvent) => void,
    private readonly sampleRate: number
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioContext = new AudioContext({
      sampleRate: this.sampleRate
    });
  }

  async setupConnection(ephemeralKey: string, model: string): Promise<void> {
    try {
      // Create RTCPeerConnection for WebRTC with robust configuration
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      // Add connection state change monitoring
      this.pc.onconnectionstatechange = () => {
        console.log("Connection state changed:", this.pc?.connectionState);
        if (this.pc?.connectionState === 'connected') {
          this.connectionActive = true;
        } else if (['disconnected', 'failed', 'closed'].includes(this.pc?.connectionState || '')) {
          this.connectionActive = false;
        }
      };

      this.pc.ontrack = async e => {
        console.log('Received remote track', e.streams[0]);
        const stream = e.streams[0];
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.audioContext.destination);
      };

      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data) as RealtimeEvent;
        console.log("Received event:", event);
        this.onMessage(event);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Log the model being used
      console.log(`Using model: ${model}`);
      
      const baseUrl = "https://api.openai.com/v1/realtime";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("SDP response error:", errorText);
        throw new Error(`Failed to establish connection: ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");
      
    } catch (error) {
      console.error("Error setting up WebRTC connection:", error);
      throw error;
    }
  }

  addTracks(stream: MediaStream): void {
    if (!this.pc) {
      throw new Error("PeerConnection not initialized");
    }
    
    stream.getTracks().forEach(track => {
      console.log(`Adding track to peer connection: ${track.kind} (${track.label})`);
      this.pc?.addTrack(track, stream);
    });
  }

  sendAudioBuffer(audioData: Float32Array, isPaused: boolean): void {
    if (this.dc?.readyState === 'open' && !isPaused) {
      this.dc.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: encodeAudioData(audioData)
      }));
    }
  }

  sendMessage(text: string): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  isConnected(): boolean {
    return this.connectionActive && this.dc?.readyState === 'open';
  }

  pauseAudio(): void {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resumeAudio(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  close(): void {
    this.connectionActive = false;
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
