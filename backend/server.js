import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import bodyParser from 'body-parser';
import http from 'http';       // Import http to create an HTTP server
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';


const app = express();
const PORT = 5005;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase the limit to 50MB or any other value you need
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Increase the limit for URL-encoded data

// Serve static files from the media directory
app.use('/media', express.static(path.join(__dirname, 'media'), {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
})); 

// Create HTTP server
const server = http.createServer(app);


async function requestGPT(messages, jsonFormat = true) {
    console.log("------------------new GPT Request------------------");
    // console.log(messages);

    const client = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
    });

    try {
        const events = await client.chat.completions.create({
            messages: messages,
            max_tokens: 4000,
            model: "gpt-4o",
            ...(jsonFormat && {
                response_format: {
                    type: "json_object"
                }
            }),
            stream: true,
        });


        let result = "";
        for await (const event of events) {
            for (const choice of event.choices) {
                const delta = choice.delta?.content;
                if (delta !== undefined) {
                    result += delta;
                }
            }
        }
        console.log("------------------result------------------");
        console.log(result);
        return result;
    } catch (error) {
        console.error(error);
        return json({ error: "Failed to make GPT call." });
    }
}


// Function to get agent messages for a session and concatenate utterances
async function getMessagesForSession(sessionID, maxTimestamp = -1) {
    try {
        let url;
        if (maxTimestamp === -1) {
            url = `http://localhost:5006/messages?sessionID=${sessionID}`;
        } else {
            url = `http://localhost:5006/messages?sessionID=${sessionID}&timestamp_lte=${maxTimestamp}`;
        }
        const response = await axios.get(url, {
            headers: {
            }
        });

        const prevMessages = response.data;
        const concatenatedMessages = prevMessages.map(item => ` Timestamp: ${item.timestamp} |
                                                                Message: ${item.message}   
                                                                ` ).join('\n');
        return concatenatedMessages;
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        throw error;
    }
}


//  POST /generate-llm-response
app.post('/generate-llm-response', async (req, res) => {
    console.log('/generate-llm-response -- Received request:', req.body);
    const { sessionID, maxTimestamp, systemPrompt, screenshot, transcript, includePrevMessages = true } = req.body;


    if (!sessionID) {
        return res.status(400).json({ error: 'Invalid or missing session ID.' });
    }
    if (isNaN(maxTimestamp)) {
        return res.status(400).json({ error: 'Invalid or missing maxTimestamp.' });
    }
    if (!systemPrompt) {
        return res.status(400).json({ error: 'Invalid or missing system prompt.' });
    }
    if (!transcript) {
        return res.status(400).json({ error: 'Invalid or missing transcript.' });
    }
    if (!screenshot || screenshot.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing screenshot.' });
    }

    // --- SCALE DOWN SCREENSHOT USING SHARP ---
    let scaledScreenshotBase64 = screenshot;
    try {
        // Remove data URL prefix
        const base64Data = screenshot.replace(/^data:image\/(jpeg|png);base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        // Use sharp to resize to 1200px width, keep aspect ratio, output JPEG
        const outputBuffer = await sharp(imgBuffer)
            .resize({ width: 1200 })
            .jpeg()
            .toBuffer();
        scaledScreenshotBase64 = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;

        // Save the downscaled image to disk (only for debugging purposes)
        const timestamp = Date.now();
        const fileName = `${sessionID}_${timestamp}_downscaled.jpg`;
        const filePath = path.join(__dirname, "media", fileName);
        // fs.writeFileSync(filePath, outputBuffer);
        // console.log('Downscaled image saved:', filePath);
    } catch (err) {
        console.error('Error scaling screenshot with sharp:', err);
        // fallback: use original screenshot
    }
    const screenshots = [scaledScreenshotBase64]

    // Only fetch previousMessages if includePrevMessages is true
    var previousMessages = includePrevMessages ? await getMessagesForSession(sessionID, maxTimestamp) : '';


    const GPTmessages = [
        { role: "system", content: systemPrompt },
        {
            role: "user", content: [
                {
                    "type": "text",
                    "text": `TRANSCRIPT: ${transcript}
                            ${includePrevMessages ? `PREVIOUS_AGENT_MESSAGES: ${previousMessages}` : ''}`
                },
                ...screenshots.map(base64Image => ({
                    "type": "image_url",
                    "image_url": {
                        "url": base64Image
                    }
                }))
            ]
        }
    ];


    const gptReply = await requestGPT(GPTmessages);
    console.log("GPT Reply: ", gptReply);

    const response = JSON.parse(gptReply);

    res.json({
        uuid: uuidv4(),
        sessionID: sessionID,
        message: response.message,
    });
})



// GET /list-media-mp4-basenames
app.get('/list-media-mp4-basenames', (req, res) => {
    try {
        const mediaDir = path.join(__dirname, 'media');
        const files = fs.readdirSync(mediaDir);
        const mp4BaseNames = files
            .filter(file => file.toLowerCase().endsWith('.mp4'))
            .map(file => path.basename(file, '.mp4'));
        res.json({ basenames: mp4BaseNames });
    } catch (error) {
        console.error('Error listing MP4 files:', error);
        res.status(500).json({ error: 'Failed to list MP4 files.' });
    }
});


// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// Handle graceful shutdown
const shutdown = () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);




