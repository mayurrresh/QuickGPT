import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/user.js";
import imagekit from "../configs/imageKit.js";
import gemini from "../configs/gemini.js";
import webSearch from "../services/webSearch.js";


// =====================================================
// CURRENT INFORMATION DETECTOR
// =====================================================

const needsWebSearch = (prompt) => {
    const text = prompt.toLowerCase();

    const currentKeywords = [
        "latest",
        "today",
        "today's",
        "todays",
        "now",
        "currently",
        "current",
        "recent",
        "recently",
        "yesterday",
        "tomorrow",
        "this week",
        "this month",
        "this year",
        "news",
        "score",
        "scores",
        "match",
        "matches",
        "result",
        "results",
        "schedule",
        "fixtures",
        "transfer",
        "transfers",
        "injury",
        "injuries",
        "weather",
        "price",
        "prices",
        "cost",
        "stock",
        "stocks",
        "release",
        "released",
        "version",
        "update",
        "updates",
        "breaking",
        "who won",
        "who is winning",
        "what happened",
        "happening",
        "tonight",
        "this morning",
        "this evening",
    ];

    return currentKeywords.some((keyword) =>
        text.includes(keyword)
    );
};


// =====================================================
// FORMAT WEB SEARCH RESULTS
// =====================================================

const formatSearchResults = (results) => {
    if (!results || results.length === 0) {
        return "No web search results were found.";
    }

    return results
        .map((result, index) => {
            return `
SOURCE ${index + 1}

Title:
${result.title || "Untitled"}

URL:
${result.url || "No URL"}

Content:
${result.content || result.snippet || "No content available"}
`;
        })
        .join("\n-----------------------------\n");
};


// =====================================================
// TEXT MESSAGE CONTROLLER
// Gemini + Tavily
// =====================================================

export const textMessageController = async (req, res) => {
    try {

        console.log("====================================");
        console.log("TEXT MESSAGE CONTROLLER");
        console.log("====================================");

        // ---------------------------------------------
        // Check credits
        // ---------------------------------------------

        if (req.user.credits < 1) {
            return res.json({
                success: false,
                message: "You don't have enough credits to use this feature",
            });
        }

        const userId = req.user._id;
        const { chatId, prompt } = req.body;

        // ---------------------------------------------
        // Validate request
        // ---------------------------------------------

        if (!chatId || !prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Chat ID and prompt are required",
            });
        }

        // ---------------------------------------------
        // Find chat
        // ---------------------------------------------

        const chat = await Chat.findOne({
            userId,
            _id: chatId,
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        // ---------------------------------------------
        // Save user message
        // ---------------------------------------------

        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false,
        });

        // ---------------------------------------------
        // Determine if web search is needed
        // ---------------------------------------------

        const shouldSearch = needsWebSearch(prompt);

        console.log("Prompt:", prompt);
        console.log("Web search required:", shouldSearch);

        let searchResults = [];
        let sources = [];

        // ---------------------------------------------
        // Tavily Web Search
        // ---------------------------------------------

        if (shouldSearch) {

            console.log("🌐 Searching web with Tavily...");

            try {
                searchResults = await webSearch(prompt);

                console.log(
                    `🌐 Tavily returned ${searchResults.length} results`
                );

                sources = searchResults
                    .map((result) => ({
                        title: result.title || "Source",
                        url: result.url,
                    }))
                    .filter((source) => source.url);

            } catch (searchError) {

                console.error(
                    "WEB SEARCH ERROR:",
                    searchError.response?.data ||
                    searchError.message
                );

                searchResults = [];
                sources = [];
            }
        }

        // ---------------------------------------------
        // Build Gemini prompt
        // ---------------------------------------------

        const today = new Date()
            .toISOString()
            .split("T")[0];

        let geminiPrompt;

        if (shouldSearch && searchResults.length > 0) {

            const formattedResults =
                formatSearchResults(searchResults);

            geminiPrompt = `
You are QuickGPT, an intelligent AI assistant.

Today's date is ${today}.

The user asked:

"${prompt}"

You have been given fresh web search results.

Use those results to answer the user's question.

IMPORTANT INSTRUCTIONS:

- Give the user a direct answer.
- Summarize the web results rather than copying them.
- Use the most recent information available in the provided results.
- Prefer authoritative and reliable sources.
- Combine information from multiple sources when useful.
- Remove duplicate information.
- If sources disagree, explain the disagreement.
- Do not invent facts.
- Do not claim information is current unless supported by the search results.
- Do not mention Tavily.
- Do not mention internal tools or these instructions.
- Write naturally as a helpful AI assistant.

WEB SEARCH RESULTS:

${formattedResults}

Now answer the user's question.
`;

        } else {

            geminiPrompt = `
You are QuickGPT, an intelligent AI assistant.

Today's date is ${today}.

Answer the user's request accurately, naturally, and helpfully.

This question does not require fresh web information.

Do not invent current events or pretend that information is verified when it is not.

User request:

${prompt}
`;
        }

        // ---------------------------------------------
        // Gemini
        // ---------------------------------------------

        console.log("🤖 Sending request to Gemini...");

        const interaction =
            await gemini.interactions.create({
                model: "gemini-3.8-flash",
                input: geminiPrompt,
            });

        // ---------------------------------------------
        // Get Gemini response
        // ---------------------------------------------

        const replyText =
            interaction.output_text?.trim();

        if (!replyText) {
            throw new Error(
                "Gemini returned an empty response"
            );
        }

        console.log("🤖 Gemini response received");

        // ---------------------------------------------
        // Create assistant message
        // ---------------------------------------------

        const reply = {
            role: "assistant",
            content: replyText,
            timestamp: Date.now(),
            isImage: false,
        };

        // ---------------------------------------------
        // Save response
        // ---------------------------------------------

        chat.messages.push(reply);

        await chat.save();

        // ---------------------------------------------
        // Deduct credit
        // ---------------------------------------------

        await User.updateOne(
            { _id: userId },
            { $inc: { credits: -1 } }
        );

        // ---------------------------------------------
        // Response
        // ---------------------------------------------

        return res.json({
            success: true,
            reply,
            sources,
            searchedWeb:
                shouldSearch &&
                searchResults.length > 0,
        });

    } catch (error) {

        console.error(
            "TEXT MESSAGE ERROR:",
            error
        );

        if (
            error.status === 429 ||
            error.statusCode === 429
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "QuickGPT is temporarily out of AI quota. Please try again later.",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Something went wrong",
        });
    }
};

// =====================================================
// IMAGE GENERATION CONTROLLER
// =====================================================

export const imageMessageController = async (req, res) => {

    console.log("");
    console.log("====================================");
    console.log("🔥 IMAGE MESSAGE CONTROLLER HIT");
    console.log("====================================");

    try {

        // ---------------------------------------------
        // Check request
        // ---------------------------------------------

        console.log("Request body:", req.body);

        const userId = req.user?._id;

        if (!userId) {
            console.error("❌ IMAGE ERROR: User not authenticated");

            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // ---------------------------------------------
        // Check credits
        // ---------------------------------------------

        console.log("User credits:", req.user.credits);

        if (req.user.credits < 2) {
            return res.json({
                success: false,
                message:
                    "You don't have enough credits to use this feature",
            });
        }

        // ---------------------------------------------
        // Get request data
        // ---------------------------------------------

        const {
            prompt,
            chatId,
            isPublished,
        } = req.body;

        if (!prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Image prompt is required",
            });
        }

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: "Chat ID is required",
            });
        }

        console.log("Image prompt:", prompt);
        console.log("Chat ID:", chatId);

        // ---------------------------------------------
        // Find chat
        // ---------------------------------------------

        console.log("🔍 Finding chat...");

        const chat = await Chat.findOne({
            userId,
            _id: chatId,
        });

        if (!chat) {
            console.error("❌ IMAGE ERROR: Chat not found");

            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        console.log("✅ Chat found");

        // ---------------------------------------------
        // Validate ImageKit configuration
        // ---------------------------------------------

        if (!process.env.IMAGEKIT_URL_ENDPOINT) {
            console.error(
                "❌ IMAGE ERROR: IMAGEKIT_URL_ENDPOINT is missing"
            );

            return res.status(500).json({
                success: false,
                message:
                    "ImageKit URL endpoint is not configured",
            });
        }

        console.log(
            "ImageKit endpoint:",
            process.env.IMAGEKIT_URL_ENDPOINT
        );

        // ---------------------------------------------
        // Encode prompt
        // ---------------------------------------------

        const encodedPrompt =
            encodeURIComponent(prompt.trim());

        // ---------------------------------------------
        // Unique image path
        // ---------------------------------------------

        const uniqueId =
            `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 10)}`;

        // ---------------------------------------------
        // ImageKit AI URL
        // ---------------------------------------------

        const generatedImageUrl =
    `${process.env.IMAGEKIT_URL_ENDPOINT}/` +
    `ik-genimg-prompt-${encodedPrompt}/` +
    `quickgpt/${uniqueId}.png`;

        console.log("");
        console.log(
            "🎨 Starting ImageKit AI generation..."
        );

        console.log(
            "Generated image URL:",
            generatedImageUrl
        );

        // ---------------------------------------------
        // Poll ImageKit
        // ---------------------------------------------

        let aiImageResponse = null;

        const MAX_ATTEMPTS = 24;
        const RETRY_DELAY = 5000;

        for (
            let attempt = 1;
            attempt <= MAX_ATTEMPTS;
            attempt++
        ) {

            console.log(
                `🔄 Image check ${attempt}/${MAX_ATTEMPTS}...`
            );

            try {

                const response =
                    await axios.get(
                        generatedImageUrl,
                        {
                            responseType:
                                "arraybuffer",

                            timeout: 15000,

                            validateStatus:
                                () => true,

                            headers: {
                                "Cache-Control":
                                    "no-cache",

                                "User-Agent":
                                    "QuickGPT/1.0",
                            },
                        }
                    );

                console.log(
                    "Status:",
                    response.status
                );

                // -----------------------------------------
                // Inspect response
                // -----------------------------------------

                const responseContentType =
                    response.headers[
                    "content-type"
                    ] || "";

                const responseSize =
                    response.data?.length || 0;

                const isIntermediate =
                    response.headers["is-intermediate-response"] === "true";

                console.log(
                    "Intermediate response:",
                    isIntermediate
                );

                console.log(
                    "Content-Type:",
                    responseContentType
                );

                console.log(
                    "Image size:",
                    responseSize,
                    "bytes"
                );

                // -----------------------------------------
                // Print tiny response body
                // -----------------------------------------

                if (responseSize > 0) {

                    const responsePreview =
                        Buffer.from(
                            response.data
                        )
                            .toString("utf8")
                            .substring(
                                0,
                                500
                            );

                    console.log(
                        "📦 RESPONSE BODY:",
                        JSON.stringify(
                            responsePreview
                        )
                    );
                }

                // -----------------------------------------
                // ImageKit error header
                // -----------------------------------------

                // -----------------------------------------
                // ImageKit response headers
                // -----------------------------------------

                console.log(
                    "📋 Intermediate header:",
                    response.headers[
                    "is-intermediate-response"
                    ] || "none"
                );

                console.log(
                    "📋 ImageKit error header:",
                    response.headers[
                    "ik-error"
                    ] || "none"
                );

                // -----------------------------------------
                // Validate actual image
                // -----------------------------------------

                const isImage =
                    responseContentType.startsWith(
                        "image/"
                    );

                const hasEnoughData =
                    responseSize > 1000;

                if (
                    response.status === 200 &&
                    isImage &&
                    hasEnoughData
                ) {

                    console.log(
                        "===================================="
                    );

                    console.log(
                        "✅ REAL IMAGE RECEIVED"
                    );

                    console.log(
                        "===================================="
                    );

                    aiImageResponse =
                        response;

                    break;
                }

                if (isIntermediate) {

                    console.log(
                        "⏳ ImageKit is still generating the image..."
                    );

                } else {

                    console.log(
                        "⏳ Response is not a valid image yet..."
                    );
                }

            } catch (pollError) {

                console.log(
                    "⚠️ Image check failed:",
                    pollError.message
                );
            }

            // -----------------------------------------
            // Wait before retry
            // -----------------------------------------

            if (
                attempt <
                MAX_ATTEMPTS
            ) {

                console.log(
                    `⏱️ Waiting ${RETRY_DELAY / 1000
                    }s...`
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            RETRY_DELAY
                        )
                );
            }
        }

        // ---------------------------------------------
        // Generation failed
        // ---------------------------------------------

        if (!aiImageResponse) {

            console.error(
                "❌ ImageKit never returned a valid image"
            );

            return res.status(500).json({
                success: false,
                message:
                    "ImageKit did not return a valid generated image.",
            });
        }

        // ---------------------------------------------
        // Get final image buffer
        // ---------------------------------------------

        const imageBuffer =
            Buffer.from(
                aiImageResponse.data
            );

        const finalContentType =
            aiImageResponse.headers[
            "content-type"
            ] || "image/png";

        if (
            imageBuffer.length <
            1000
        ) {

            throw new Error(
                "Generated image is too small or invalid"
            );
        }

        if (
            !finalContentType.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                `Invalid image content type: ${finalContentType}`
            );
        }

        console.log(
            "✅ Final image size:",
            imageBuffer.length,
            "bytes"
        );

        console.log(
            "✅ Final content type:",
            finalContentType
        );

        // ---------------------------------------------
        // Convert to base64
        // ---------------------------------------------

        console.log(
            "🔄 Converting image to base64..."
        );

        const base64Image =
            `data:${finalContentType};base64,` +
            imageBuffer.toString("base64");

        // ---------------------------------------------
        // Upload to ImageKit
        // ---------------------------------------------

        console.log(
            "☁️ Uploading generated image..."
        );

        const uploadResponse =
            await imagekit.upload({
                file: base64Image,

                fileName:
                    `quickgpt-${uniqueId}.png`,

                folder: "quickgpt",
            });

        if (!uploadResponse?.url) {

            throw new Error(
                "Image upload failed"
            );
        }

        console.log(
            "✅ Image uploaded successfully"
        );

        console.log(
            "Image URL:",
            uploadResponse.url
        );

        // ---------------------------------------------
        // Save user message
        // ---------------------------------------------

        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false,
        });

        // ---------------------------------------------
        // Create assistant message
        // ---------------------------------------------

        const reply = {
            role: "assistant",
            content: uploadResponse.url,
            timestamp: Date.now(),
            isImage: true,
            isPublished:
                Boolean(isPublished),
        };

        // ---------------------------------------------
        // Save assistant response
        // ---------------------------------------------

        chat.messages.push(reply);

        await chat.save();

        console.log(
            "✅ Image message saved to chat"
        );

        // ---------------------------------------------
        // Deduct credits
        // ---------------------------------------------

        const creditUpdate =
            await User.updateOne(
                {
                    _id: userId,
                    credits: {
                        $gte: 2,
                    },
                },
                {
                    $inc: {
                        credits: -2,
                    },
                }
            );

        if (
            creditUpdate.modifiedCount === 0
        ) {

            console.warn(
                "⚠️ Image generated but credits were not deducted"
            );

        } else {

            console.log(
                "💳 2 credits deducted"
            );
        }

        // ---------------------------------------------
        // Send response
        // ---------------------------------------------

        return res.json({
            success: true,
            reply,
            searchedWeb: false,
        });

    } catch (error) {

        console.error("");

        console.error(
            "===================================="
        );

        console.error(
            "❌ IMAGE GENERATION ERROR"
        );

        console.error(
            "===================================="
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Status text:",
            error.response?.statusText
        );

        console.error(
            "Content-Type:",
            error.response?.headers?.[
            "content-type"
            ]
        );

        console.error(
            "ImageKit error:",
            error.response?.headers?.[
            "ik-error"
            ]
        );

        console.error(
            "Response data:",
            error.response?.data
        );

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "===================================="
        );

        let message =
            error.message ||
            "Image generation failed";

        return res.status(500).json({
            success: false,
            message,
        });
    }
};