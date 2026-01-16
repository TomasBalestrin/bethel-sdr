import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Users, BarChart3, Mail, Lock, UserCircle, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import logoImg from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const features = [
  {
    icon: Users,
    title: 'Gestão de Leads',
    description: 'Importe, qualifique e distribua leads automaticamente'
  },
  {
    icon: Calendar,
    title: 'Agendamentos',
    description: 'CRM Kanban integrado com calendário'
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Métricas de performance e conversão'
  },
  {
    icon: CheckCircle,
    title: 'Automação',
    description: 'Regras de distribuição inteligentes'
  }
];

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

  // Redirect if already logged in
  if (user && !loading) {
    return <Navigate to={from} replace />;
  }

  const isLockedOut = lockoutUntil && new Date() < lockoutUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isLockedOut) {
      toast({
        title: 'Conta bloqueada',
        description: 'Aguarde 15 minutos antes de tentar novamente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      loginSchema.parse(loginData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000));
        toast({
          title: 'Conta bloqueada',
          description: 'Muitas tentativas falhas. Aguarde 15 minutos.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao entrar',
          description: 'Email ou senha incorretos.',
          variant: 'destructive',
        });
      }
    } else {
      setFailedAttempts(0);
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
    }

    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse(signupData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    const { error } = await signUp(signupData.email, signupData.password, signupData.name);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Erro ao cadastrar',
          description: 'Este email já está cadastrado.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Cadastro realizado!',
        description: 'Sua conta foi criada com sucesso.',
      });
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
              <img src={logoImg} alt="Bethel" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Bethel SDR
              </h1>
              <p className="text-xs text-white/60 uppercase tracking-widest font-medium">
                Sales Management
              </p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white leading-tight">
            Gestão completa de leads e agendamentos
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-md">
            Potencialize suas vendas com ferramentas inteligentes de distribuição, CRM e relatórios avançados.
          </p>
        </div>
        
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-200"
            >
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
              <p className="text-xs text-white/60 mt-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-sm text-white/40">
          © 2026 Bethel SDR. Todos os direitos reservados.
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
              <img src={logoImg} alt="Bethel" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Bethel SDR
              </h1>
            </div>
          </div>
          
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Bem-vindo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Entre na sua conta ou crie uma nova
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-md font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="rounded-md font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Cadastrar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-semibold">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 h-11 input-enhanced"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          disabled={isSubmitting || isLockedOut}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-semibold">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-11 input-enhanced"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          disabled={isSubmitting || isLockedOut}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200" 
                      disabled={isSubmitting || isLockedOut}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                    
                    {isLockedOut && (
                      <p className="text-sm text-center text-destructive">
                        Conta bloqueada. Tente novamente em 15 minutos.
                      </p>
                    )}
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-semibold">Nome</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-10 h-11 input-enhanced"
                          value={signupData.name}
                          onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-semibold">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 h-11 input-enhanced"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-semibold">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-11 input-enhanced"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-semibold">Confirmar Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-11 input-enhanced"
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}