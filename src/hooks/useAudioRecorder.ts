import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderResult {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  duration: number;
  audioLevel: number;
}

// Check if audio recording is available
export const isAudioRecordingSupported = (): boolean => {
  // Check for secure context (allow localhost and file:// for development)
  const isSecure = window.isSecureContext ||
                   location.protocol === 'https:' ||
                   location.hostname === 'localhost' ||
                   location.hostname === '127.0.0.1' ||
                   location.protocol === 'file:';

  if (!isSecure) {
    console.warn('Audio recording requires HTTPS or localhost');
    return false;
  }

  // Check for MediaRecorder
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder not supported');
    return false;
  }

  // Check for getUserMedia
  const hasGetUserMedia = !!(
    navigator.mediaDevices?.getUserMedia ||
    navigator.getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
  );

  if (!hasGetUserMedia) {
    console.warn('getUserMedia not available');
  }

  return hasGetUserMedia;
};

export const useAudioRecorder = (): UseAudioRecorderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Check if running in secure context (required for getUserMedia)
      const isSecure = window.isSecureContext ||
                       location.protocol === 'https:' ||
                       location.hostname === 'localhost' ||
                       location.hostname === '127.0.0.1' ||
                       location.protocol === 'file:';

      if (!isSecure) {
        throw new Error('Audio recording requires HTTPS. Please use the application over HTTPS or localhost.');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback for older browsers
        const getUserMedia = navigator.getUserMedia ||
                           (navigator as any).webkitGetUserMedia ||
                           (navigator as any).mozGetUserMedia;

        if (!getUserMedia) {
          throw new Error('Audio recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        }

        // Use legacy getUserMedia
        const stream = await new Promise<MediaStream>((resolve, reject) => {
          getUserMedia.call(navigator,
            { audio: true },
            resolve,
            reject
          );
        });

        streamRef.current = stream;
      } else {
        // Modern getUserMedia with basic settings that should work
        console.log('Requesting microphone access with basic settings...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false, // Disable processing that might cause issues
            noiseSuppression: false,
            autoGainControl: true,   // Keep this for volume
            // Remove specific constraints that might not be supported
            // sampleRate: 16000,
            // channelCount: 1,
            // volume: 1.0
          }
        });

        console.log('Audio stream obtained successfully');

        streamRef.current = stream;
      }

      // Set up audio level monitoring
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(streamRef.current);

        analyser.fftSize = 256;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start monitoring audio levels
        const monitorAudioLevel = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average audio level
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const normalizedLevel = Math.round((average / 255) * 100);
            setAudioLevel(normalizedLevel);

            if (normalizedLevel > 5) {
              console.log('Audio level detected:', normalizedLevel + '%');
            }
          }
        };

        levelIntervalRef.current = setInterval(monitorAudioLevel, 100);
        console.log('Audio level monitoring started');
      } catch (error) {
        console.warn('Could not set up audio level monitoring:', error);
      }

      audioChunksRef.current = [];

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('Audio recording is not supported in this browser. Please use a modern browser.');
      }

      // Test audio stream first
      console.log('Audio stream tracks:', streamRef.current.getTracks());
      streamRef.current.getTracks().forEach(track => {
        console.log('Track:', track.kind, track.label, track.enabled, track.muted);
      });

      // Create MediaRecorder with fallback formats - try MP4 first for better compatibility
      let mediaRecorder: MediaRecorder;
      let selectedMimeType = '';

      const supportedMimeTypes = [
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/webm;codecs=opus',
        'audio/webm',
        '' // Default
      ];

      console.log('Checking supported MIME types:');
      supportedMimeTypes.forEach(type => {
        const supported = type === '' || MediaRecorder.isTypeSupported(type);
        console.log(`${type || 'default'}: ${supported}`);
      });

      for (const mimeType of supportedMimeTypes) {
        try {
          if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
            const options = mimeType ? {
              mimeType,
              audioBitsPerSecond: 128000 // 128kbps for good quality
            } : {};

            mediaRecorder = new MediaRecorder(streamRef.current, options);
            selectedMimeType = mimeType || 'default';
            console.log('Successfully created MediaRecorder with:', selectedMimeType);
            break;
          }
        } catch (e) {
          console.warn('Failed to create MediaRecorder with mime type:', mimeType, e);
          continue;
        }
      }

      if (!mediaRecorder!) {
        throw new Error('Could not create MediaRecorder with any supported format');
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, total chunks:', audioChunksRef.current.length);
      };

      // Start recording - collect data more frequently for better results
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setIsProcessing(false);
      setDuration(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsProcessing(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      setIsProcessing(true);

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        if (levelIntervalRef.current) {
          clearInterval(levelIntervalRef.current);
          levelIntervalRef.current = null;
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        setIsRecording(false);
        setIsProcessing(false);
        setDuration(0);
        setAudioLevel(0);

        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    duration,
    audioLevel,
  };
};