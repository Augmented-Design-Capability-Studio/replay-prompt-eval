import { useState, useEffect, useRef } from 'react';
import axios from 'axios';


interface Message {
  id?: number;
  uuid?: string;
  sessionID?: string;
  message: string;
  timestamp?: number;
  rating?: number; 
  comment?: string; 
}


const CodingInterface = () => {

  const [availableSessionIDs, setAvailableSessionIDs] = useState<string[]>([]);
  const [sessionID, setSessionID] = useState<string>('P16');
  const [allSessionMessages, setAllSessionMessages] = useState<Message[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(`hybrid-sessions/${sessionID}_daily.mp4`);


  useEffect(() => {
    setVideoSrc(`${import.meta.env.VITE_API_BASE_URL}/media/${sessionID}.mp4`);
  }, [sessionID]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (videoRef.current) {
        if (event.key === 'ArrowLeft') {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        } else if (event.key === 'ArrowRight') {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  const handleMessageClick = (videoTimeSeconds: number) => {
    console.log('Message clicked, seeking to:', videoTimeSeconds);
    if (videoRef.current && Number.isFinite(videoTimeSeconds)) {
      videoRef.current.currentTime = videoTimeSeconds;
      videoRef.current.play();
    }
  };


  const handleCommentChange = (id: number, newComment: string) => {
    setAllSessionMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === id ? { ...msg, comment: newComment } : msg
      )
    );
  };


  const fetchMessages = () => {
    axios.get(`${import.meta.env.VITE_DB_BASE_URL}/messages/?sessionID=${sessionID}&_sort=timestamp&_order=asc`, {
    })
      .then(response => {
        const fetchedMessages: Message[] = response.data.map((msg: any) => msg);
        setAllSessionMessages(fetchedMessages);
        console.log('Fetched all session messages:', fetchedMessages);
      })
      .catch(error => {
        console.error('Error fetching all session messages:', error);
      });
  };


  useEffect(() => {
    fetchMessages();
  }, [sessionID]);

  const deleteMessageOnServer = (id: number) => {
    console.log('Deleting message:', id);
    axios.delete(`${import.meta.env.VITE_DB_BASE_URL}/messages/${id}`)
      .then(response => {
        console.log('Message deleted:', response.data);
        fetchMessages();
      })
      .catch(error => {
        console.error('Error deleting message:', error);
      });
  };

  const updateMessageOnServer = (id: number, obj: object) => {
    console.log('Updating message:', id, obj);
    axios.patch(`${import.meta.env.VITE_DB_BASE_URL}/messages/${id}`, obj, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        console.log('Message updated:', response.data);
        fetchMessages();
      })
      .catch(error => {
        console.error('Error updating message:', error);
      });
  }


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



  // Utility function to convert seconds to hh:mm:ss
  function secondsToHMS(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  }


  


  return (
    <div className="flex flex-col h-screen p-4 bg-gray-200">
      <div className='text-xl font-bold mb-2'>Replay <a href="/" className='text-gray-500 hover:underline'>Prompter</a> | Coder</div>

      <fieldset className="fieldset">
        <legend className="label-text text-xs font-bold mb-1">Loaded Session</legend>
        <select
          className="select select-xs select-bordered outline mb-4"
          value={sessionID}
          onChange={(e) => setSessionID(e.target.value)}
        >
          {availableSessionIDs.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </fieldset>

      <div className="video-container">
        <video ref={videoRef} key={videoSrc} controls className="w-1/2 mb-4 rounded-lg">
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>


      {/* MESSAGES */}
      <div className={`pl-4 mt-4 h-full overflow-y-auto`} id="message-container">

        <ul>
          {allSessionMessages.map((msg) => (

            <div key={msg.id}
              className={`relative p-2 border rounded-md max-w-[1000px] mb-4 cursor-pointer border-2 border-black`}
              onClick={() => handleMessageClick(Number(msg.timestamp))} >

              <div className="text-xs"> {msg.sessionID} | #{msg.id} | Time: {secondsToHMS(Number(msg.timestamp))}</div>
              <p className='font-bold mt-2'>{msg.message}</p>
              <div className="flex flex-col items-start mt-1">

                {/* RATING STARS */}
                <div className="flex flex-row items-center gap-2 mt-1 mb-2">
                  <span className="label-text text-xs font-bold">Rating</span>
                  <div className="rating rating-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <input
                        key={star}
                        type="radio"
                        name="rating-llm-msg"
                        className="mask mask-star-2 bg-primary"
                        aria-label={`${star} star`}
                        checked={msg.rating === star}
                        onChange={() => {
                          const newRating = msg.rating === star ? 0 : star; // Toggle rating
                          updateMessageOnServer(Number(msg.id), { rating: newRating });
                        }}

                      />
                    ))}
                  </div>
                </div>

                {/* COMMENT INPUT */}
                <fieldset className="fieldset">
                  <legend className="label-text text-xs font-bold mb-1">Comment</legend>
                  <input type="text"
                    className="input input-bordered input-sm w-96 outline text-xs"
                    placeholder="Enter a comment"
                    value={msg.comment}
                    onChange={(e) => handleCommentChange(Number(msg.id), e.target.value)}
                    onBlur={(e) => {
                      const newComment = e.target.value;
                      updateMessageOnServer(Number(msg.id), { comment: newComment });
                    }}
                  />
                </fieldset>

                {/* DELETE BUTTON */}
                <button
                  className="btn btn-xs btn-outline btn-content absolute bottom-2 right-2"
                  title="Delete message"
                  onClick={e => {
                    e.stopPropagation();
                    deleteMessageOnServer(Number(msg.id));
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default CodingInterface