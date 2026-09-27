import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const Login = () => {
  const [state, setState] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { axios, setToken } = useAppContext();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

const BASE_URL = import.meta.env.VITE_SERVER_URL;

const url =
  state === "login"
    ? `${BASE_URL}/api/user/login`
    : `${BASE_URL}/api/user/register`;
    
    const payload =
  state === "login"
    ? {
        email: email.toLowerCase().trim(),
        password,
      }
    : {
        name,
        email: email.toLowerCase().trim(),
        password,
      };


    try {
      const { data } = await axios.post(url, payload);

      if (data.success) {
        // 🔐 store token
        setToken(data.token);
        localStorage.setItem("token", data.token);

        toast.success(
          state === "login" ? "Login successful" : "Account created successfully"
        );

        // 🚀 redirect after auth
        navigate("/");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] text-gray-500 rounded-lg shadow-xl border border-gray-200 bg-white"
    >
      <p className="text-2xl font-medium m-auto">
        <span className="text-purple-700">User</span>{" "}
        {state === "login" ? "Login" : "Sign Up"}
      </p>

      {state === "register" && (
        <div className="w-full">
          <p>Name</p>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-purple-700"
            type="text"
            required
          />
        </div>
      )}

      <div className="w-full">
        <p>Email</p>
        <input
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          className="border border-gray-200 rounded w-full p-2 mt-1 outline-purple-700"
          type="email"
          required
        />
      </div>

      <div className="w-full">
        <p>Password</p>
        <input
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          className="border border-gray-200 rounded w-full p-2 mt-1 outline-purple-700"
          type="password"
          required
        />
      </div>

      <p>
        {state === "register" ? (
          <>
            Already have an account?{" "}
            <span
              onClick={() => setState("login")}
              className="text-purple-700 cursor-pointer"
            >
              click here
            </span>
          </>
        ) : (
          <>
            Create an account?{" "}
            <span
              onClick={() => setState("register")}
              className="text-purple-700 cursor-pointer"
            >
              click here
            </span>
          </>
        )}
      </p>

      <button className="bg-purple-700 hover:bg-purple-800 transition-all text-white w-full py-2 rounded-md">
        {state === "register" ? "Create Account" : "Login"}
      </button>
    </form>
  );
};

export default Login;
