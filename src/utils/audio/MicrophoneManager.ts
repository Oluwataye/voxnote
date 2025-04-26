
export class MicrophoneManager {
  private stream: MediaStream | null = null;

  async requestMicrophonePermission(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      console.log('Requesting microphone permission with constraints:', JSON.stringify(constraints));
      
      // Try to enumerate devices first to see what's available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`Found ${audioInputDevices.length} audio input devices:`, 
        audioInputDevices.map(d => `${d.label || 'Unknown Device'} (${d.deviceId.substring(0, 8)}...)`));
      
      // Request access to the microphone with the specified constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify we have audio tracks and they're enabled
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('No audio track found in the stream');
      }
      
      console.log(`Successfully connected to microphone: ${audioTracks[0].label}`);
      console.log(`Microphone settings:`, audioTracks[0].getSettings());
      
      if (!audioTracks[0].enabled) {
        audioTracks[0].enabled = true;
        if (!audioTracks[0].enabled) {
          throw new Error('Could not enable audio track');
        }
      }
      
      this.stream = stream;
      return stream;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access to use the voice features.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use the voice features.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Cannot access microphone. It may be in use by another application or not properly connected.');
        } else if (error.name === 'OverconstrainedError') {
          // This happens when constraints can't be satisfied - try again with default constraints
          console.log('Microphone constraints too strict, trying with default constraints');
          return this.requestMicrophonePermission({ audio: true });
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
