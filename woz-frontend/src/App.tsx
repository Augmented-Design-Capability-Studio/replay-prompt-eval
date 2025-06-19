import { useState, useEffect } from 'react';
import VideoPlayerWithTranscript from './components/VideoPlayerWithTranscript';
import { DEFAULT_PROMPT } from './defaultPrompt';


interface Message {
  id?: number;
  uuid?: string;
  sessionID?: string;
  message: string;
  rating?: number;
}


function App() {

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMessageAvailable, setIsMessageAvailable] = useState<boolean>(false);
  const [availableSessionIDs, setAvailableSessionIDs] = useState<string[]>([]);
  const [sessionID, setSessionID] = useState<string>('');
  const [maxTimestamp, setMaxTimestamp] = useState<number>(0);
  const [msgRating, setMsgRating] = useState<number>(3);
  const [msgRatingComment, setMsgRatingComment] = useState<string>('');
  const [llmSystemPrompt, setLlmSystemPrompt] = useState<string>(DEFAULT_PROMPT);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [includePrevMessages, setIncludePrevMessages] = useState<boolean>(true);


  useEffect(() => {
    // Fetch available session IDs (MP4 basenames) from backend on mount
    const fetchSessionIDs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/list-media-mp4-basenames`);
        if (!response.ok) {
          throw new Error('Failed to fetch session IDs');
        }
        const data = await response.json();
        if (data && Array.isArray(data.basenames)) {
          setAvailableSessionIDs(data.basenames);
          setSessionID(data.basenames[0]); // Set the first available session ID as default
        }
      } catch (error) {
        console.error('Error fetching available session IDs:', error);
      }
    };
    fetchSessionIDs();
  }, []);



  const handleVideoTimeUpdate = (time: number) => {
    setCurrentVideoTime(time);
    setMaxTimestamp(Math.floor(time));
  };


  const requestNewMessage = async () => {
    setIsLoading(true);

    // Get screenshot from video at current time as base64
    const videoEl = document.querySelector('video');
    let screenshotBase64 = '';
    if (videoEl) {
      // Only capture at original resolution, do not downscale
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        screenshotBase64 = canvas.toDataURL('image/jpeg');
      }
    }
    // console.log('Screenshot Base64:', screenshotBase64);
    
    // get current content from textarea with id="transcript" from the VideoPlayerWithTranscript component
    const transcriptTextarea = document.getElementById('transcript') as HTMLTextAreaElement;
    const currentTranscript = transcriptTextarea ? transcriptTextarea.value : '';
    console.log('Current Transcript:', currentTranscript);


    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/generate-llm-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionID,
          maxTimestamp,
          systemPrompt: llmSystemPrompt,
          screenshot: screenshotBase64,
          transcript: currentTranscript,
          includePrevMessages,
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }
      const data = await response.json();
      console.log('Message received:', data);
      const receivedMessage: Message = {
        uuid: data.uuid,
        message: data.message,
        sessionID: data.sessionID
      };
      setMessage(receivedMessage);
      setIsMessageAvailable(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching message:', error);
    }
  };


  const sendMessageFeedback = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_DB_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...message,
          "rating": msgRating,
          "comment": msgRatingComment,
          "timestamp": maxTimestamp
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }
      const data = await response.json();
      console.log('Message sent:', data);
      resetCurrentMessage(); // Request a new message after sending feedback
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const resetCurrentMessage = () => {
    // Optionally reset the message state
    setMessage(null);
    setIsMessageAvailable(false);
    setMsgRatingComment('');
    setMsgRating(3);
  }


  // Video and SRT source paths based on sessionID
  const videoSrc = `${import.meta.env.VITE_API_BASE_URL}/media/${sessionID}.mp4`;
  const srtSrc = `${import.meta.env.VITE_API_BASE_URL}/media/${sessionID}.srt`;


  // Load LLM system prompt from localStorage on mount (only if not already set by React)
  useEffect(() => {
    const savedPrompt = localStorage.getItem('llmSystemPrompt');
    // Only set if the user hasn't typed anything yet (avoid overwriting React's initial state)
    if (savedPrompt !== null && savedPrompt !== llmSystemPrompt) {
      setLlmSystemPrompt(savedPrompt);
    }
  }, []);

  // Save LLM system prompt to localStorage whenever it changes
  useEffect(() => {
    if (llmSystemPrompt !== undefined && llmSystemPrompt !== null) {
      localStorage.setItem('llmSystemPrompt', llmSystemPrompt);
    }
  }, [llmSystemPrompt]);
  



  return (
    <div className="flex flex-col min-h-screen p-4 bg-gray-200">

      <div className='text-xl font-bold mb-2'>Replay Prompter | <a href="/woz/coding" className='text-gray-500 hover:underline'>Coder</a></div>

      <div className='flex flex-row items-start gap-4 bg-gray-200'>
        <div className="">
          <fieldset className="fieldset">
            <legend className="label-text text-xs font-bold mb-1">Loaded Session</legend>
            <select
              className="select select-xs select-bordered outline"
              value={sessionID}
              onChange={(e) => setSessionID(e.target.value)}
            >
              {availableSessionIDs.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </fieldset>
        </div>


        <div className="">
          <fieldset className="fieldset">
            <div className="flex items-center justify-between mb-1">
              <legend className="label-text text-xs font-bold mr-4">System Prompt</legend>
              <div className="flex items-center">
                <span className='text-xs mr-1'>Include</span>
                <input
                  type="checkbox"
                  id="includePrevMessages"
                  checked={includePrevMessages}
                  onChange={e => setIncludePrevMessages(e.target.checked)}
                  className="mr-1"
                />
                <label htmlFor="includePrevMessages" className="label-text text-xs">Previous Agent Messages</label>
              </div>
            </div>
            <textarea
              className="input input-xs input-bordered w-[600px] min-h-[160px] outline"
              rows={10}
              value={llmSystemPrompt}
              onChange={(e) => setLlmSystemPrompt(e.target.value)}
            />
          </fieldset>
        </div>


        {/* BUTTON SEND TO LLM  */}
        {!isMessageAvailable && (
          <div className="">
            <button
              className="btn btn-primary btn-outline m-4 w-48 flex flex-col"
              disabled={isLoading}
              onClick={requestNewMessage}
            >
              Request LLM Response for Sec {maxTimestamp}
            </button>
            {isLoading && (
              <span className="loading loading-dots loading-xs flex flex-col"></span>
            )}
          </div>
        )}


        {/* RESULT FROM LLM  */}
        {isMessageAvailable && (

          <fieldset>
            <legend className="label-text text-xs font-bold mb-1">LLM Response</legend>
            <div>
              <div className="card w-96 bg-base-100 card-accent outline outline-primary p-0">
                <div className="card-body p-3 text-sm font-bold">
                  <p>{message?.message}</p>
                </div>
              </div>

              <div className="flex flex-col items-start mt-1">

                {/* RATING STARS */}
                <div className="flex flex-row items-center gap-2 mt-1">
                  <span className="label-text text-xs font-bold">Rate this response</span>
                  <div className="rating rating-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <input
                        key={star}
                        type="radio"
                        name="rating-llm-msg"
                        className="mask mask-star-2 bg-primary"
                        aria-label={`${star} star`}
                        checked={msgRating === star}
                        onChange={() => setMsgRating(star)}
                      />
                    ))}
                  </div>
                </div>

                {/* COMMENT INPUT */}
                <input type="text"
                  className="input input-bordered input-sm w-96 outline mt-2 text-xs"
                  placeholder="Enter a comment"
                  value={msgRatingComment}
                  onChange={(e) => setMsgRatingComment(e.target.value)}
                />
                <div className="flex flex-row items-center gap-2 mt-1">
                  <button
                    className="flex flex-col btn btn-outline btn-xs btn-primary mt-2"
                    onClick={() => sendMessageFeedback()}
                  >
                    Save Response Rating
                  </button>
                  <button
                    className="flex flex-col btn btn-xs btn-outline btn-gray-200 mt-2"
                    onClick={() => resetCurrentMessage()}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          </fieldset>
        )}
      </div>

      <div className={`mt-6`}>
        <p className='text-md font-mono'>Playback Position: {currentVideoTime.toFixed(0)} seconds</p>

        <VideoPlayerWithTranscript
          videoSrc={videoSrc}
          srtSrc={srtSrc}
          onTimeUpdate={handleVideoTimeUpdate}
        />
      </div>
      {/* )} */}
    </div>
  );
}

export default App;