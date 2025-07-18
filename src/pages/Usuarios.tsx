import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, createItem, updateItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  groups: { id: number; name: string }[];
}

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface Group {
  id: number;
  name: string;
}

const createUserSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  email: z.string().email("Correo inválido"),
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  password2: z.string().min(6, "Confirma la contraseña"),
  groups: z.array(z.number()).min(1, "Selecciona al menos un rol"),
}).refine((data) => data.password === data.password2, {
  message: "Las contraseñas no coinciden",
  path: ["password2"],
});

const editUserSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  email: z.string().email("Correo inválido"),
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  password: z.string().optional(),
  groups: z.array(z.number()).min(1, "Selecciona al menos un rol"),
});

const loadAllUsuarios = async (): Promise<User[]> => {
  const allUsuarios: User[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchData<ApiResponse<User>>(`users/all/?page=${page}`);
    if (response && 'results' in response) {
      allUsuarios.push(...response.results);
      hasMore = !!response.next;
      page++;
    } else {
      hasMore = false;
    }
  }
  return allUsuarios;
};

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [roles, setRoles] = useState<Group[]>([]);
  const [searchEmail, setSearchEmail] = useState("");

  const createForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      password2: "",
      groups: [],
    },
  });

  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      groups: [],
    },
  });

  const loadUsuarios = async () => {
    setIsLoading(true);
    try {
      const data = await loadAllUsuarios();
      setUsuarios(data);
    } catch (error) {
      toast.error("Error al cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchData<{ results: Group[] }>("users/groups/");
      if (data && Array.isArray(data.results)) {
        setRoles(data.results);
      }
    } catch (error) {
      toast.error("Error al cargar los roles.");
    }
  };

  useEffect(() => {
    loadUsuarios();
    loadRoles();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditMode(true);
      setCurrentUser(user);
      editForm.reset({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        password: "",
        groups: user.groups.map(g => g.id),
      });
    } else {
      setIsEditMode(false);
      setCurrentUser(null);
      createForm.reset();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (isEditMode) {
      const isValid = await editForm.trigger();
      if (!isValid || !currentUser) return;
      setIsSaving(true);
      const values = editForm.getValues();
      if (!values.password) {
        delete values.password;
      }
      try {
        await updateItem<User>("users/all/", currentUser.id, values);
        toast.success("Usuario actualizado exitosamente.");
        loadUsuarios();
        handleCloseModal();
      } catch (error) {
        toast.error("Error al actualizar el usuario.");
      } finally {
        setIsSaving(false);
      }
    } else {
      const isValid = await createForm.trigger();
      if (!isValid) return;
      setIsSaving(true);
      const values = createForm.getValues();
      try {
        await createItem<User>("users/all/register/", values);
        toast.success("Usuario creado exitosamente.");
        loadUsuarios();
        handleCloseModal();
      } catch (error) {
        toast.error("Error al crear el usuario.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const columns = [
    { key: "username", header: "Usuario" },
    { key: "email", header: "Correo", render: (row: User) => row.email || "Sin correo" },
    { key: "is_active", header: "Activo", render: (row: User) => row.is_active ? "Sí" : "No" },
    { key: "groups", header: "Rol", render: (row: User) => row.groups.map(g => g.name).join(", ") },
    { key: "password", header: "Contraseña", render: () => "••••••" },
    {
      key: "actions",
      header: "Acciones",
      render: (row: User) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filteredUsuarios = usuarios.filter(user =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        onAdd={() => handleOpenModal()}
        addButtonText="Nuevo Usuario"
      />
      {/* Barra de búsqueda por email */}
      <div className="flex justify-end mb-2">
        <Input
          type="text"
          placeholder="Buscar por correo..."
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <DataTable
        data={filteredUsuarios}
        columns={columns}
      />
      {/* Eliminar la paginación local */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? "Editar Usuario" : "Nuevo Usuario"}
        form={
          isEditMode ? (
            <Form {...editForm}>
              <form className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="Dejar en blanco para no cambiar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="groups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((rol) => (
                          <label key={rol.id} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={field.value.includes(rol.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, rol.id]);
                                } else {
                                  field.onChange(field.value.filter((id: number) => id !== rol.id));
                                }
                              }}
                            />
                            {rol.name}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          ) : (
            <Form {...createForm}>
              <form className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="groups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((rol) => (
                          <label key={rol.id} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={field.value.includes(rol.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, rol.id]);
                                } else {
                                  field.onChange(field.value.filter((id: number) => id !== rol.id));
                                }
                              }}
                            />
                            {rol.name}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
      />
    </div>
  );
};

export default Usuarios; 