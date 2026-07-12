'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Truck, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateCredentials } from '@/actions/auth/login';

// Form validation schema using Zod
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Seeded mock accounts for easy hackathon demo evaluation
const demoAccounts = [
  { label: 'Admin', email: 'admin@transitops.com', desc: 'Full System Access' },
  { label: 'Manager', email: 'manager@transitops.com', desc: 'Fleet Operations' },
  { label: 'Finance', email: 'finance@transitops.com', desc: 'Expenses & Tolls' },
  { label: 'Safety', email: 'safety@transitops.com', desc: 'Maintenance Logs' },
  { label: 'Driver', email: 'michael.driver@transitops.com', desc: 'Trips & Fuel Logs' },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const toastId = toast.loading('Authenticating credentials...');

    try {
      // 1. Pre-validate credentials using Server Action
      const validation = await validateCredentials(data);

      if (!validation.success) {
        toast.error(validation.error || 'Authentication failed', { id: toastId });
        setIsLoading(false);
        return;
      }

      // 2. Call NextAuth client sign-in handler
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || 'Login failed. Please verify credentials.', { id: toastId });
        setIsLoading(false);
        return;
      }

      toast.success('Successfully authenticated. Redirecting to dashboard...', { id: toastId });
      
      // Delay navigation slightly to let toast render and provide visual feedback
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 800);

    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred. Please try again.', { id: toastId });
      setIsLoading(false);
    }
  };

  const selectDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password@123', { shouldValidate: true });
    toast.info(`Filled form with demo account: ${email}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground overflow-hidden">
      {/* Premium background gradients inspired by Vercel/Linear */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-background to-background" />
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="flex w-full max-w-5xl gap-12 items-center flex-col lg:flex-row z-10">
        
        {/* Left column: Branding & Product pitch */}
        <div className="flex flex-col flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 justify-center lg:justify-start mb-6 text-indigo-500"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">TransitOps</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75"
          >
            Smart Transport Operations
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed"
          >
            A high-performance enterprise dashboard designed to automate routing dispatch, vehicle registries, fuel auditing, and operational compliance.
          </motion.p>
        </div>

        {/* Right column: Login form & Demo account selectors */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md lg:max-w-md flex flex-col gap-6"
        >
          <div className="glass rounded-2xl p-8 border border-border/40 bg-card/60 backdrop-blur-md shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-sans">Welcome Back</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in with your enterprise credentials</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/60">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="flex w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none disabled:opacity-50"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive mt-0.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/60">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="flex w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-10 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-0.5">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Login selector */}
          <div className="glass rounded-xl p-4 border border-border/40 bg-card/40 backdrop-blur-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Quick Demo Authentication</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => selectDemoAccount(account.email)}
                  disabled={isLoading}
                  className="flex flex-col items-start p-2.5 rounded-lg border border-border/60 hover:border-indigo-500/50 bg-background/30 hover:bg-background/80 transition-all text-left text-xs disabled:opacity-50 disabled:hover:border-border/60 disabled:hover:bg-background/30"
                >
                  <span className="font-semibold">{account.label}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">{account.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
