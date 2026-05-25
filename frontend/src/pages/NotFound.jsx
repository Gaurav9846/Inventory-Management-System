// src/pages/NotFound.jsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user?.role === "MANAGER" ? "/manager" : user?.role === "STAFF" ? "/staff" : "/";
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-8xl font-black text-muted-foreground/20">404</p>
      <div>
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">The page you're looking for doesn't exist.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Go Back</Button>
        <Button onClick={() => navigate(home)}><Home className="h-4 w-4 mr-1" /> Dashboard</Button>
      </div>
    </div>
  );
}
