import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAdmin({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.token) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.profile?.role !== "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }
    setChecked(true);
  }, [user, navigate]);

  if (!checked) return null;
  return children;
}

