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

  constructor(private onMessage: (message: RealtimeEvent) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioContext = new AudioContext({
      sampleRate: this.SAMPLE_RATE
    });
  }

  private async requestMicrophonePermission(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      return stream;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access to use the voice features.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use the voice features.');
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

      // Request microphone permission first
      const ms = await this.requestMicrophonePermission();

      this.pc = new RTCPeerConnection();

      this.pc.ontrack = async e => {
        const stream = e.streams[0];
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.audioContext.destination);
      };

      ms.getTracks().forEach(track => this.pc?.addTrack(track, ms));

      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data) as RealtimeEvent;
        console.log("Received event:", event);
        this.onMessage(event);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

      this.recorder = new AudioRecorder((audioData) => {
        if (this.dc?.readyState === 'open') {
          this.dc.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeAudioData(audioData)
          }));
        }
      });
      await this.recorder.start();

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
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

  disconnect() {
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
