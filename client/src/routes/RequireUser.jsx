import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireUser({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Must be authenticated
    if (!user?.token) {
      navigate("/login", { replace: true });
      return;
    }
    // Only goal_setter allowed in this section; redirect others to their dashboards
    if (user?.profile?.role !== "goal_setter") {
      navigate("/dashboard-redirect", { replace: true });
      return;
    }
    setChecked(true);
  }, [user, navigate]);

  if (!checked) return null;
  return children;
}
