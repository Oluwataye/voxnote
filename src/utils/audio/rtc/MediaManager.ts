
export class MediaManager {
  private audioSender: RTCRtpSender | null = null;
  private mediaStream: MediaStream | null = null;
  private isAudioPaused: boolean = false;

  constructor() {}

  addTracksToConnection(
    stream: MediaStream,
    peerConnection: RTCPeerConnection
  ): RTCRtpSender | null {
    try {
      if (!stream) {
        console.error("Cannot add tracks: No stream provided");
        return null;
      }

      this.mediaStream = stream;
      
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
        
        this.audioSender = peerConnection.addTrack(track, stream);
        console.log(`Added track: ${track.kind} (${track.label})`);
      }
      
      return this.audioSender;
    } catch (error) {
      console.error("Error adding tracks to peer connection:", error);
      throw error;
    }
  }

  hasAudioTracks(): boolean {
    return !!this.audioSender;
  }

  pauseAudio(): void {
    this.isAudioPaused = true;
  }

  resumeAudio(): void {
    this.isAudioPaused = false;
  }

  isAudioPaused(): boolean {
    return this.isAudioPaused;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  cleanup(): void {
    this.audioSender = null;
    this.mediaStream = null;
  }
}
