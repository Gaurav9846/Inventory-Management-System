// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Droplets, Loader2, Eye, EyeOff, Shield, Briefcase, User } from "lucide-react";

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      if (user.role === "MANAGER")     navigate("/manager");
      else if (user.role === "STAFF")  navigate("/staff");
      else                             navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50">
            <Droplets className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Fusion IMS</h1>
            <p className="text-slate-400 text-sm mt-0.5">Inventory Management System</p>
          </div>
        </div>

        {/* Role badges */}
        <div className="flex items-center justify-center gap-6">
          {[
            { dot: "bg-blue-500",    label: "Admin Panel"   },
            { dot: "bg-emerald-500", label: "Manager Panel" },
            { dot: "bg-violet-500",  label: "Staff Panel"   },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Card */}
        <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur shadow-2xl">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-white text-lg">Sign in to your account</CardTitle>
            <CardDescription className="text-slate-400">
              You'll be directed to your role's panel automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Email address</Label>
                <Input type="email" placeholder="your@email.com"
                  className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } })}
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Password</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="••••••••"
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 pr-10"
                    {...register("password", { required: "Password is required" })}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Default credentials hint */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 text-center">Default Admin Credentials</p>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Email</span><span className="font-mono text-slate-300">admin@fusionit.com</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Password</span><span className="font-mono text-slate-300">Admin@123</span></div>
        </div>

        <p className="text-center text-xs text-slate-600">Fusion I.T. Solutions · Pokhara · v2.0.0</p>
      </div>
    </div>
  );
}
