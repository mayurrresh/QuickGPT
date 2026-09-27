import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;

// ================= AXIOS INTERCEPTOR =================
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loadingUser, setLoadingUser] = useState(true);

  // ================= LOGOUT =================
  const forceLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setChats([]);
    setSelectedChat(null);
    navigate("/login");
  };

  // ================= FETCH USER =================
  const fetchUser = async () => {
    if (!token) {
      setLoadingUser(false);
      return;
    }

    try {
      const { data } = await axios.get("/api/user/data");

      if (data.success) {
        setUser(data.user);
      } else {
        forceLogout();
      }
    } catch (error) {
      if (error.response?.status === 401) {
        forceLogout();
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoadingUser(false);
    }
  };

  // ================= FETCH CHATS =================
  const fetchUsersChats = async () => {
    if (!token) return;

    try {
      const { data } = await axios.get("/api/chat/get");

      if (!data?.success) {
        toast.error(data.message);
        return;
      }

      const fetchedChats = data.chats || [];
      setChats(fetchedChats);

      // ✅ Only set selectedChat if it does not exist
      setSelectedChat((prev) => {
        if (prev) {
          // keep current chat if still exists
          const stillExists = fetchedChats.find(
            (chat) => chat?._id === prev._id
          );
          return stillExists || fetchedChats[0] || null;
        }
        return fetchedChats[0] || null;
      });
    } catch (error) {
      if (error.response?.status === 401) {
        forceLogout();
      } else {
        toast.error(error.message);
      }
    }
  };

  // ================= CREATE CHAT =================
  const createNewChat = async () => {
    if (!user) return;

    try {
      const { data } = await axios.get("/api/chat/create");

      if (!data?.success) {
        toast.error(data.message);
        return;
      }

      setChats((prev) => [data.chat, ...prev]);
      setSelectedChat(data.chat);
      navigate("/");
    } catch (error) {
      if (error.response?.status === 401) {
        forceLogout();
      } else {
        toast.error(error.message);
      }
    }
  };

  // ================= THEME =================
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ================= TOKEN CHANGE =================
  useEffect(() => {
    fetchUser();
  }, [token]);

  // ================= USER CHANGE =================
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      setChats([]);
      setSelectedChat(null);
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        chats,
        setChats,
        selectedChat,
        setSelectedChat, // ✅ EXPOSED
        theme,
        setTheme,
        loadingUser,
        token,
        setToken,
        createNewChat,
        fetchUsersChats,
        axios,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
