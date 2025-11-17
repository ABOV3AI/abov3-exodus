export namespace AudioPlayer {

  /**
   * Plays an audio file from a URL (e.g. an MP3 file).
   */
  export async function playUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(new Error(`Error playing audio: ${e}`));
      audio.play().catch(reject);
    });
  }

  /**
   * Plays an audio buffer (e.g. from an ArrayBuffer).
   * @param audioBuffer The audio data to play
   * @param playbackRate Optional playback speed (0.5 = half speed, 2.0 = double speed). Changes pitch. Default: 1.0
   */
  export async function playBuffer(audioBuffer: ArrayBuffer, playbackRate: number = 1.0): Promise<void> {
    const audioContext = new AudioContext();
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = await audioContext.decodeAudioData(audioBuffer);
    bufferSource.playbackRate.value = playbackRate;
    bufferSource.connect(audioContext.destination);
    bufferSource.start();
    return new Promise((resolve) => {
      bufferSource.onended = () => resolve();
    });
  }

}
