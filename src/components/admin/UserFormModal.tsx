import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUpdateProfile, useUpdateUserRole, useToggleUserActive } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileWithRole, AppRole } from '@/types/database';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'lider', 'sdr', 'closer']),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  active: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const editUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'lider', 'sdr', 'closer']),
  active: z.boolean().default(true),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

interface UserFormModalProps {
  user?: ProfileWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormModal({ user, open, onOpenChange }: UserFormModalProps) {
  const isEditing = !!user;
  const queryClient = useQueryClient();

  const updateProfile = useUpdateProfile();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado com sucesso');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
  });

  const form = useForm<CreateUserFormData | EditUserFormData>({
    resolver: zodResolver(isEditing ? editUserSchema : createUserSchema),
    defaultValues: isEditing
      ? {
          name: user.name,
          email: user.email,
          role: user.role || 'sdr',
          active: user.active,
        }
      : {
          name: '',
          email: '',
          role: 'sdr',
          password: '',
          confirmPassword: '',
          active: true,
        },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && user) {
        form.reset({
          name: user.name,
          email: user.email,
          role: user.role || 'sdr',
          active: user.active,
        });
      } else {
        form.reset({
          name: '',
          email: '',
          role: 'sdr',
          password: '',
          confirmPassword: '',
          active: true,
        });
      }
    }
  }, [open, user, isEditing, form]);

  const onSubmit = async (data: CreateUserFormData | EditUserFormData) => {
    if (isEditing && user) {
      // Update existing user
      try {
        await updateProfile.mutateAsync({ id: user.id, name: data.name });
        
        if (data.role !== user.role) {
          await updateRole.mutateAsync({ userId: user.user_id, role: data.role as AppRole });
        }
        
        if (data.active !== user.active) {
          await toggleActive.mutateAsync({ id: user.id, active: data.active });
        }
        
        onOpenChange(false);
      } catch (error) {
        // Errors are handled by the mutations
      }
    } else {
      // Create new user
      createUserMutation.mutate(data as CreateUserFormData);
    }
  };

  const isPending = createUserMutation.isPending || updateProfile.isPending || updateRole.isPending || toggleActive.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@exemplo.com" 
                      {...field} 
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="lider">Líder</SelectItem>
                      <SelectItem value="sdr">SDR</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Usuário pode acessar o sistema
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
