import React, { useEffect, useRef } from 'react';
import { Howl } from 'howler';

interface Sound {
  id: string;
  howl: Howl;
}

class SoundLibrary {
  private sounds: Map<string, Sound>;
  private volume: number;
  private muted: boolean;

  constructor() {
    this.sounds = new Map();
    this.volume = 0.5;
    this.muted = false;

    // Initialize sounds
    this.addSound('hover', '/sounds/hover.mp3', { volume: 0.2 });
    this.addSound('click', '/sounds/click.mp3', { volume: 0.3 });
    this.addSound('success', '/sounds/success.mp3', { volume: 0.4 });
    this.addSound('ambient', '/sounds/ambient.mp3', { 
      volume: 0.1,
      loop: true,
      fade: true
    });
  }

  private addSound(id: string, url: string, options: {
    volume?: number;
    loop?: boolean;
    fade?: boolean;
  } = {}) {
    const howl = new Howl({
      src: [url],
      volume: options.volume || 0.5,
      loop: options.loop || false,
      fade: options.fade || false
    });

    this.sounds.set(id, { id, howl });
  }

  play(id: string) {
    if (this.muted) return;
    const sound = this.sounds.get(id);
    if (sound) {
      sound.howl.play();
    }
  }

  stop(id: string) {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.howl.stop();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.howl.volume(this.volume);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sounds.forEach(sound => {
      sound.howl.mute(this.muted);
    });
  }

  playAmbient() {
    if (this.muted) return;
    const ambient = this.sounds.get('ambient');
    if (ambient) {
      ambient.howl.fade(0, this.volume * 0.1, 2000);
      ambient.howl.play();
    }
  }

  stopAmbient() {
    const ambient = this.sounds.get('ambient');
    if (ambient) {
      ambient.howl.fade(ambient.howl.volume(), 0, 1000);
      setTimeout(() => ambient.howl.stop(), 1000);
    }
  }
}

export const useSoundManager = () => {
  const soundLibraryRef = useRef<SoundLibrary>();

  useEffect(() => {
    soundLibraryRef.current = new SoundLibrary();
    return () => {
      // Cleanup sounds
      soundLibraryRef.current?.stopAmbient();
    };
  }, []);

  return {
    playSound: (id: string) => soundLibraryRef.current?.play(id),
    stopSound: (id: string) => soundLibraryRef.current?.stop(id),
    setVolume: (volume: number) => soundLibraryRef.current?.setVolume(volume),
    toggleMute: () => soundLibraryRef.current?.toggleMute(),
    playAmbient: () => soundLibraryRef.current?.playAmbient(),
    stopAmbient: () => soundLibraryRef.current?.stopAmbient()
  };
};

interface SoundProviderProps {
  children: React.ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const { playAmbient, stopAmbient } = useSoundManager();

  useEffect(() => {
    playAmbient();
    return () => stopAmbient();
  }, []);

  return <>{children}</>;
}; 