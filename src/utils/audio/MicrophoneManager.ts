
export class MicrophoneManager {
  private stream: MediaStream | null = null;

  async requestMicrophonePermission(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
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
      
      this.stream = stream;
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

  getStream(): MediaStream | null {
    return this.stream;
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind} (${track.label})`);
      });
      this.stream = null;
    }
  }
}
