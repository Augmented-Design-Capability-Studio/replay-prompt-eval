import React, { useEffect, useRef, useState } from 'react';

interface Transcript {
  start: number;
  text: string;
}

interface VideoPlayerWithTranscriptProps {
  videoSrc: string;
  srtSrc: string;
  onTimeUpdate: (time: number) => void;
}

// Define the parseSRT function
const parseSRT = (data: string): Transcript[] => {
  const srtPattern = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
  const transcripts: Transcript[] = [];
  let match;

  while ((match = srtPattern.exec(data)) !== null) {
    const start = convertTimecodeToSeconds(match[2]);
    const text = match[4].replace(/\n/g, ' ');
    transcripts.push({ start, text });
  }

  return transcripts;
};

// Helper function to convert SRT timecode to seconds
const convertTimecodeToSeconds = (timecode: string): number => {
  const [hours, minutes, seconds] = timecode.split(':');
  const [secs, millis] = seconds.split(',');
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(secs, 10) +
    parseInt(millis, 10) / 1000
  );
};


const VideoPlayerWithTranscript: React.FC<VideoPlayerWithTranscriptProps> = ({ videoSrc, srtSrc, onTimeUpdate }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fetch and parse SRT file
    fetch(srtSrc)
      .then((response) => response.text())
      .then((data) => setTranscripts(parseSRT(data)))
      .catch((err) => console.error('Error loading SRT file:', err));
  }, [srtSrc]);

  useEffect(() => {
    // Scroll to the bottom of the textarea when currentTranscript changes
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [currentTranscript]);

  // Update transcript and notify parent of current time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;

      // Build transcript until the current time
      const visibleText = transcripts
        .filter((t) => t.start <= currentTime)
        .map((t) => {
          // Format start time as [hh:mm:ss]
          const date = new Date(t.start * 1000);
          const hh = String(date.getUTCHours()).padStart(2, '0');
          const mm = String(date.getUTCMinutes()).padStart(2, '0');
          const ss = String(date.getUTCSeconds()).padStart(2, '0');
          return `[${hh}:${mm}:${ss}] ${t.text}`;
        })
        .join('\n');

      setCurrentTranscript(visibleText);

      // Notify parent component
      onTimeUpdate(currentTime);
    }
  };

  return (
    <div 
    className='flex flex-row gap-2'>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        style={{ maxWidth: '60%' }}
        onTimeUpdate={handleTimeUpdate}
        className='rounded-lg '
        crossOrigin="anonymous"
      />
      
      <textarea
        id="transcript"
        ref={textareaRef}
        readOnly
        value={currentTranscript}
        style={{ width: '35%', height: '300px', resize: 'none' }}
        className='textarea textarea-bordered font-mono text-xs'
      />
    </div>
  );
};



export default VideoPlayerWithTranscript;