import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import moment from 'moment'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Sidebar = ({ isMenuOpen, setIsMenuOpen }) => {
  const navigate = useNavigate()

  const {
    chats,
    setSelectedChat,
    theme,
    setTheme,
    user,
    createNewChat,
    axios,
    setChats,
    fetchUsersChats,
    setToken,
    token
  } = useAppContext()

  const [search, setSearch] = useState('')

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    toast.success('Logged out Successfully')
    navigate('/login')
  }

  const deleteChat = async (e, chatId) => {
    try {
      e.stopPropagation()
      if (!chatId) return

      const confirmDelete = window.confirm('Are you sure you want to delete this chat?')
      if (!confirmDelete) return

      const { data } = await axios.post(
        '/api/chat/delete',
        { chatId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data?.success) {
        setChats(prev => prev.filter(chat => chat?._id !== chatId))
        await fetchUsersChats()
        toast.success(data.message)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  return (
    <div
      className={`flex flex-col h-screen min-w-72 p-5 dark:bg-gradient-to-b from-[#242124]/30 to-[#000000]/30 
      border-r border-[#80609F]/30 backdrop-blur-3xl transition-all duration-500 
      max-md:absolute left-0 z-1 ${!isMenuOpen && 'max-md:-translate-x-full'}`}
    >
      {/* Logo */}
      <img
        src={theme === 'dark' ? assets.logo_full : assets.logo_full_dark}
        alt="App Logo"
        className="w-full max-w-48"
      />

      {/* New Chat */}
      <button
        onClick={createNewChat}
        className="flex justify-center items-center w-full py-2 mt-10 text-white 
        bg-gradient-to-r from-[#A456F7] to-[#3D81F6] text-sm rounded-md cursor-pointer"
      >
        <span className="mr-2 text-xl">+</span> New Chat
      </button>

      {/* Search */}
      <div className="flex items-center gap-2 p-3 mt-4 border border-gray-400 dark:border-white/20 rounded-md">
        <img src={assets.search_icon} className="w-4 not-dark:invert" alt="" />
        <input
          type="text"
          placeholder="Search Conversations"
          className="text-xs placeholder:text-gray-400 outline-none w-full"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {Array.isArray(chats) && chats.length > 0 && (
        <p className="mt-4 text-sm">Recent Chats</p>
      )}

      <div className="flex-1 overflow-y-scroll mt-3 text-sm space-y-3">
        {Array.isArray(chats) &&
          chats
            .filter(chat => {
              if (!chat) return false

              const firstMessage = chat.messages?.[0]?.content ?? ''
              const chatName = chat.name ?? ''

              return firstMessage
                ? firstMessage.toLowerCase().includes(search.toLowerCase())
                : chatName.toLowerCase().includes(search.toLowerCase())
            })
            .map(chat => (
              <div
                key={chat._id}
                onClick={() => {
                  if (!chat?._id) return
                  setSelectedChat(chat)
                  navigate('/')
                  setIsMenuOpen(false)
                }}
                className="p-2 px-4 dark:bg-[#57317C]/10 border border-gray-300 
                dark:border-[#80609F]/15 rounded-md cursor-pointer flex justify-between group"
              >
                <div>
                  <p className="truncate w-full">
                    {chat.messages?.[0]?.content
                      ? chat.messages[0].content.slice(0, 32)
                      : chat.name || 'Untitled Chat'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#B1A6C0]">
                    {chat.updatedAt ? moment(chat.updatedAt).fromNow() : ''}
                  </p>
                </div>

                <img
                  src={assets.bin_icon}
                  alt=""
                  className="hidden group-hover:block w-4 cursor-pointer not-dark:invert"
                  onClick={e =>
                    toast.promise(deleteChat(e, chat._id), {
                      loading: 'Deleting...',
                      success: 'Chat deleted',
                      error: 'Failed to delete'
                    })
                  }
                />
              </div>
            ))}
      </div>

      {/* Community */}
      <div
        onClick={() => {
          navigate('/community')
          setIsMenuOpen(false)
        }}
        className="flex items-center gap-2 p-3 mt-4 border border-gray-300 
        dark:border-white/15 rounded-md cursor-pointer hover:scale-103 transition-all"
      >
        <img src={assets.gallery_icon} className="w-4.5 not-dark:invert" alt="" />
        <p className="text-sm">Community Images</p>
      </div>

      {/* Credits */}
      <div
        onClick={() => {
          navigate('/credits')
          setIsMenuOpen(false)
        }}
        className="flex items-center gap-2 p-3 mt-4 border border-gray-300 
        dark:border-white/15 rounded-md cursor-pointer hover:scale-103 transition-all"
      >
        <img src={assets.diamond_icon} className="w-4.5 dark:invert" alt="" />
        <div className="text-sm">
          <p>Credits: {user?.credits ?? 0}</p>
          <p className="text-xs text-gray-400">Purchase credits to use quickgpt</p>
        </div>
      </div>

      {/* Dark Mode */}
      <div className="flex items-center justify-between gap-2 p-3 mt-4 border border-gray-300 dark:border-white/15 rounded-md">
        <div className="flex items-center gap-2 text-sm">
          <img src={assets.theme_icon} className="w-4 not-dark:invert" alt="" />
          <p>Dark Mode</p>
        </div>
        <label className="relative inline-flex cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <div className="w-9 h-5 bg-gray-400 rounded-full peer-checked:bg-purple-600 transition-all" />
          <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 p-3 mt-4 border border-gray-300 dark:border-white/15 rounded-md group">
        <img
          src={assets.user_icon}
          className="w-7 rounded-full"
          alt="User"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            {user?.name || 'User'}
          </p>

          {user?.email && (
            <p className="text-xs text-gray-400 truncate">
              {user.email}
            </p>
          )}
        </div>

        {user && (
          <img
            onClick={logout}
            src={assets.logout_icon}
            className="h-5 cursor-pointer hidden group-hover:block not-dark:invert"
            alt="Logout"
          />
        )}
      </div>

      <img
        onClick={() => setIsMenuOpen(false)}
        src={assets.close_icon}
        className="absolute top-3 right-3 w-5 h-5 cursor-pointer md:hidden not-dark:invert"
        alt=""
      />
    </div>
  )
}

export default Sidebar
