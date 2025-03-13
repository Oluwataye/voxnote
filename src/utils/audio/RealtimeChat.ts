
import { supabase } from "@/integrations/supabase/client";
import { AudioRecorder } from "./AudioRecorder";
import { encodeAudioData } from "./audioUtils";
import { 
  RealtimeEvent, 
  SessionConfig, 
  MessageEvent, 
  SessionCreatedEvent 
} from "./types";

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private audioContext: AudioContext;
  private isPaused: boolean = false;
  private readonly SAMPLE_RATE = 24000;
  private microphoneStream: MediaStream | null = null;
  private connectionActive: boolean = false;

  constructor(private onMessage: (message: RealtimeEvent) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioContext = new AudioContext({
      sampleRate: this.SAMPLE_RATE
    });
  }

  private async requestMicrophonePermission(): Promise<MediaStream> {
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
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
      
      console.log('Microphone permission granted', audioTrack.label);
      return stream;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access to use the voice features.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use the voice features.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Cannot access microphone. It may be in use by another application.');
        }
      }
      throw error;
    }
  }

  async init() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      const tokenResponse = await supabase.functions.invoke("realtime-chat");
      const data = await tokenResponse.data;
      
      if (!data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log("Got ephemeral token, connecting to OpenAI...");

      // Request microphone permission first
      this.microphoneStream = await this.requestMicrophonePermission();

      // Create RTCPeerConnection for WebRTC with more robust configuration
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

      // Add all tracks from our microphone stream to the peer connection
      this.microphoneStream.getTracks().forEach(track => {
        console.log(`Adding track to peer connection: ${track.kind} (${track.label})`);
        this.pc?.addTrack(track, this.microphoneStream!);
      });

      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data) as RealtimeEvent;
        console.log("Received event:", event);
        this.onMessage(event);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Log the model being used
      console.log(`Using model: ${data.model || 'gpt-4o'}`);
      
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = data.model || "gpt-4o"; // Get the model from the session or use gpt-4o as fallback
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
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

      this.recorder = new AudioRecorder((audioData) => {
        if (this.dc?.readyState === 'open' && !this.isPaused) {
          this.dc.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeAudioData(audioData)
          }));
        }
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
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind} (${track.label})`);
      });
      this.microphoneStream = null;
    }
  }

  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event: MessageEvent = {
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

  pause() {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      this.isPaused = false;
    }
  }

  isConnected() {
    return this.connectionActive && this.dc?.readyState === 'open';
  }

  disconnect() {
    this.connectionActive = false;
    this.recorder?.stop();
    this.cleanup();
    
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
    
    console.log("Chat disconnected and resources cleaned up");
  }
}
