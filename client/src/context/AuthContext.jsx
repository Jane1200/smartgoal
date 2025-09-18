import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api.js";
import { toast } from "react-toastify";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app as firebaseApp } from "../lib/firebase";

const firebaseAuth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("sg_auth");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("sg_auth", JSON.stringify(user));
    else localStorage.removeItem("sg_auth");
  }, [user]);

  const login = async (email, password) => {
    try {
      const ADMIN_EMAIL = "smartgoaladmin12@gmail.com";
      const ADMIN_PASSWORD = "Admin@SmartGoal";

      // Admin hardcoded
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        try {
          const { data } = await api.post("/auth/login", { email, password, role: "admin" });
          const newUser = { token: data.token, profile: data.user };
          setUser(newUser);
          toast.success("Signed in as Admin");
          return { ok: true, user: data.user };
        } catch (apiError) {
          console.warn("Admin API login failed, fallback:", apiError.message);
          const adminUser = {
            token: "hardcoded-admin-token",
            profile: {
              id: "admin-hardcoded",
              name: "Administrator",
              email: ADMIN_EMAIL,
              role: "admin",
              isVerified: true,
            },
          };
          setUser(adminUser);
          toast.success("Signed in as Admin (Fallback)");
          return { ok: true, user: adminUser.profile };
        }
      }

      // Normal user login
      console.log("Attempting login with:", { email, passwordLength: password?.length });
      const { data } = await api.post("/auth/login", { email, password });
      // Ensure any lingering Firebase client session is cleared to avoid verify-email gating
      try { await signOut(firebaseAuth); } catch {}
      const newUser = { token: data.token, profile: data.user };
      setUser(newUser);
      toast.success("Signed in");
      return { ok: true, user: data.user };
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const register = async (name, email, password, role = "goal_setter") => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password, role });
      const newUser = { token: data.token, profile: data.user };
      setUser(newUser);
      toast.success("Account created successfully");
      return { ok: true, user: data.user };
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Registration failed";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post("/auth/google", { idToken });
      const newUser = { token: data.token, profile: data.user };
      setUser(newUser);
      toast.success("Signed in with Google");
      return { ok: true, user: data.user };
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Google sign-in failed";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthCtx.Provider value={{ user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
