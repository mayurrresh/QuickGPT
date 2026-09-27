import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import Message from "./Message";
import toast from "react-hot-toast";

const ChatBox = () => {
  const containerRef = useRef(null);

  const {
    selectedChat,
    theme,
    user,
    axios,
    setUser,
    createNewChat,
    fetchUsersChats,
  } = useAppContext();

  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("text");
  const [isPublished, setIsPublished] = useState(false);

  // ================= LOAD CHAT =================
  useEffect(() => {
    setMessages(selectedChat?.messages ?? []);
  }, [selectedChat]);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // ================= SEND MESSAGE =================
  const onSubmit = async (e) => {
    e.preventDefault();

    if (sending) return;
    if (!user) return toast.error("Login to send message");
    if (!prompt.trim()) return;

    setSending(true);

    let activeChat = selectedChat;

    // 🔥 AUTO-CREATE CHAT IF NONE EXISTS
    if (!activeChat?._id) {
      try {
        await createNewChat();
        await fetchUsersChats();

        // give React one tick to update context
        activeChat = JSON.parse(
          JSON.stringify(
            (await axios.get("/api/chat/get")).data.chats[0]
          )
        );
      } catch {
        setSending(false);
        return toast.error("Failed to create chat");
      }
    }

    if (!activeChat?._id) {
      setSending(false);
      return toast.error("Chat not ready. Try again.");
    }

    const userMessage = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
      isImage: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");

    try {
      const { data } = await axios.post(`/api/message/${mode}`, {
        chatId: activeChat._id,
        prompt: userMessage.content,
        isPublished,
      });

      if (data?.success && data.reply) {
        setMessages((prev) => [...prev, data.reply]);

        setUser((prev) =>
          prev
            ? {
                ...prev,
                credits:
                  mode === "image" ? prev.credits - 2 : prev.credits - 1,
              }
            : prev
        );
      } else {
        toast.error(data?.message || "Message failed");
      }
    } catch (error) {
      toast.error(
        error?.response?.status === 429
          ? "Too many requests. Please wait."
          : error.message
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between m-5 md:m-10 xl:mx-30 max-md:mt-14 2xl:pr-40">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 mb-5 overflow-y-scroll">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-primary">
            <img
              src={theme === "dark" ? assets.logo_full : assets.logo_full_dark}
              className="w-full max-w-56 sm:max-w-68"
              alt=""
            />
            <p className="mt-5 text-4xl sm:text-6xl text-center text-gray-400 dark:text-white">
              Ask me Anything
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={msg?._id || i} message={msg} />
        ))}

        {sending && (
          <div className="loader flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></div>
          </div>
        )}
      </div>

      {mode === "image" && (
        <label className="inline-flex items-center gap-2 mb-3 text-sm mx-auto">
          <p className="text-lg text-black">
            Publish Generated Image to Community
          </p>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
        </label>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="bg-primary/20 dark:bg-[#583C79]/30 border border-primary dark:border-[#80609F]/30 rounded-full w-full max-w-2xl p-3 pl-4 mx-auto flex gap-4 items-center"
      >
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="text-sm pl-3 pr-2 outline-none"
          disabled={sending}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          type="text"
          placeholder="Type your prompt here..."
          className="flex-1 text-sm outline-none"
          disabled={sending}
          required
        />

        <button disabled={sending}>
          <img
            src={sending ? assets.stop_icon : assets.send_icon}
            className="w-8"
            alt=""
          />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
