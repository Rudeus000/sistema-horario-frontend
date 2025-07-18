import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchData, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface Materia { 
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface PeriodoAcademico {
  periodo_id: number;
  nombre_periodo: string;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface MateriaDetalle {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre: string | null;
  estado: boolean;
}

interface CarreraDetalle {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  unidad_nombre: string;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
  materias_detalle: MateriaDetalle[];
  carrera: number;
  carrera_detalle: CarreraDetalle;
  periodo: number;
  periodo_nombre: string;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente: number | null;
  docente_asignado_directamente_nombre: string | null;
  ciclo_semestral: number | null;
}

interface Column {
  header: string;
  key: string;
  render?: (row: Grupo) => React.ReactNode;
}

// Schema for form validation
const formSchema = z.object({
  codigo_grupo: z.string().min(1, "El código es obligatorio"),
  materias: z.array(z.number()).min(1, "Debe seleccionar al menos una materia"),
  carrera: z.number().min(1, "Debe seleccionar una carrera"),
  periodo: z.number().min(1, "Debe seleccionar un período"),
  numero_estudiantes_estimado: z.coerce.number().min(1, "Debe ingresar un número válido de estudiantes"),
  turno_preferente: z.string().min(1, "Debe seleccionar un turno"),
  docente_asignado_directamente: z.union([
    z.coerce.number().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]),
  ciclo_semestral: z.union([z.coerce.number().int().min(1, "Debe ser un número mayor a 0"), z.null()]).optional(),
});

const turnos = [
  { value: "M", label: "Mañana" },
  { value: "T", label: "Tarde" },
  { value: "N", label: "Noche" },
];

// 1. Definición de la interfaz Ciclo
interface Ciclo {
  ciclo_id: number;
  nombre_ciclo: string;
  orden: number;
  carrera: number;
}

const Grupos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get('periodo');
  
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiasFiltradas, setMateriasFiltradas] = useState<Materia[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState<Grupo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  const [ciclos, setCiclos] = useState<Ciclo[]>([]); // ciclos de la carrera seleccionada en el modal
  const [cicloId, setCicloId] = useState<number | null>(null); // ciclo seleccionado en el modal
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_grupo: "",
      materias: [],
      carrera: 0,
      periodo: 0,
      numero_estudiantes_estimado: 0,
      turno_preferente: "M",
      docente_asignado_directamente: null,
      ciclo_semestral: null,
    },
  });
  
  const carreraId = form.watch("carrera");
  
  const loadGrupos = async (page: number) => {
    setIsLoading(true);
    try {
      // Construir la URL con filtros
      let url = `scheduling/grupos/?page=${page}`;
      if (periodoId) {
        url += `&periodo=${periodoId}`;
      }
      
      // Agregar filtro por carrera si está disponible en los parámetros de URL
      const carreraId = searchParams.get('carrera');
      if (carreraId) {
        url += `&carrera=${carreraId}`;
      }
      
      const response = await fetchData<{ results: Grupo[], count: number }>(url);
      setGrupos(response.results || []);
      setPagination(prev => ({ ...prev, count: response.count || 0, page }));
    } catch (error) {
      console.error("Error cargando grupos:", error);
      toast.error("Error al cargar los grupos");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update materias when carrera changes
  useEffect(() => {
    console.log("[Grupos] carreraId cambiado:", carreraId);
    
    if (carreraId && carreraId > 0) {
      // Usar el endpoint específico para obtener materias por carrera
      const loadMateriasPorCarrera = async () => {
        try {
          const response = await fetchData<{materias: Materia[], count: number}>(`academic-setup/materias/por-carrera/${carreraId}/`);
          if (response && response.materias) {
            console.log("[Grupos] materias cargadas para carrera", carreraId, ":", response.materias);
            setMateriasFiltradas(response.materias);
          } else {
            console.log("[Grupos] No se encontraron materias para la carrera", carreraId);
            setMateriasFiltradas([]);
          }
        } catch (error) {
          console.error("[Grupos] Error cargando materias por carrera:", error);
          setMateriasFiltradas([]);
        }
      };
      
      loadMateriasPorCarrera();
    } else {
      console.log("[Grupos] No hay carrera seleccionada, limpiando materias filtradas");
      setMateriasFiltradas([]);
    }
  }, [carreraId]);

  const loadMateriasPorCarrera = async (carreraId: number) => {
    if (!carreraId || carreraId <= 0) {
      setMateriasFiltradas([]);
      return;
    }
    try {
      // Endpoint corregido para usar la ruta anidada correcta
      const response = await fetchData<{ results: Materia[] }>(`academic-setup/carreras/${carreraId}/materias/`);
      if (response && response.results) {
        setMateriasFiltradas(response.results);
      } else {
        setMateriasFiltradas([]);
      }
    } catch (error) {
      console.error("[Grupos] Error cargando materias por carrera:", error);
      setMateriasFiltradas([]);
    }
  };

  useEffect(() => {
    // Carga los datos principales de los grupos
    loadGrupos(pagination.page);

    // Carga los datos auxiliares una sola vez
    const loadAuxData = async () => {
      try {
        const [carrerasResponse, materiasResponse, periodosResponse, docentesResponse] = await Promise.all([
          fetchData<{ results: Carrera[] }>("academic-setup/carreras/"),
          fetchData<{ results: Materia[] }>("academic-setup/materias/"),
          fetchData<{ results: PeriodoAcademico[] }>("academic-setup/periodos-academicos/"),
          fetchData<Docente[]>("users/docentes/")
        ]);
        setCarreras(carrerasResponse.results || []);
        setMaterias(materiasResponse.results || []);
        setPeriodos(periodosResponse.results || []);
        setDocentes(docentesResponse || []);
        console.log("Docentes recibidos de la API:", docentesResponse);
      } catch (error) {
        console.error("Error loading aux data:", error);
        toast.error("Error al cargar datos auxiliares");
      }
    };

    loadAuxData();
  }, []);

  // Recargar grupos cuando cambie el período o la carrera
  useEffect(() => {
    if (periodoId) {
      loadGrupos(1);
    }
  }, [periodoId, searchParams.get('carrera')]);

  // Nuevo useEffect para refrescar el formulario cuando los docentes se cargan y el modal está abierto
  useEffect(() => {
    if (isModalOpen && docentes.length > 0) {
      if (currentGrupo) {
        form.reset({
          codigo_grupo: currentGrupo.codigo_grupo,
          materias: currentGrupo.materias,
          carrera: currentGrupo.carrera,
          periodo: currentGrupo.periodo,
          numero_estudiantes_estimado: currentGrupo.numero_estudiantes_estimado,
          turno_preferente: currentGrupo.turno_preferente,
          docente_asignado_directamente: currentGrupo.docente_asignado_directamente,
          ciclo_semestral: currentGrupo.ciclo_semestral,
        });
      } else {
        form.reset({
          codigo_grupo: "",
          materias: [],
          carrera: 0,
          periodo: 0,
          numero_estudiantes_estimado: 0,
          turno_preferente: "M",
          docente_asignado_directamente: null,
          ciclo_semestral: null,
        });
      }
    }
  }, [docentes, isModalOpen]);

  // Cargar ciclos cuando el modal está abierto y cambia la carrera
  useEffect(() => {
    if (isModalOpen && form.watch("carrera") > 0) {
      fetchData<Ciclo[]>(`academic-setup/ciclos/?carrera_id=${form.watch("carrera")}`)
        .then(response => {
          setCiclos(response || []);
          console.log('Ciclos cargados para carrera', form.watch("carrera"), ':', response);
        })
        .catch(() => setCiclos([]));
    } else if (!isModalOpen) {
      setCiclos([]);
      setCicloId(null);
    }
  }, [isModalOpen, form.watch("carrera")]);

  // Filtrar materias por ciclo cuando se selecciona uno en el modal
  useEffect(() => {
    if (isModalOpen && form.watch("carrera") > 0 && cicloId) {
      fetchData<{ results: Materia[] }>(`academic-setup/carreras/${form.watch("carrera")}/materias/?ciclo_id=${cicloId}`)
        .then(response => {
          setMateriasFiltradas(response.results || []);
          form.setValue("materias", (response.results || []).map(m => m.materia_id));
        })
        .catch(() => {
          setMateriasFiltradas([]);
          form.setValue("materias", []);
        });
    }
  }, [isModalOpen, cicloId, form.watch("carrera")]);

  // Al abrir el modal para editar, seleccionar ciclo automáticamente si aplica
  const handleOpenModal = (grupo?: Grupo) => {
    if (grupo) {
      setCurrentGrupo(grupo);
      form.reset({
        codigo_grupo: grupo.codigo_grupo,
        materias: grupo.materias,
        carrera: grupo.carrera,
        periodo: grupo.periodo,
        numero_estudiantes_estimado: grupo.numero_estudiantes_estimado,
        turno_preferente: grupo.turno_preferente,
        docente_asignado_directamente: grupo.docente_asignado_directamente,
        ciclo_semestral: grupo.ciclo_semestral,
      });
      // Buscar ciclo de la primera materia (si existe)
      if (grupo.materias.length > 0) {
        fetchData<{ ciclo_id: number }>(`academic-setup/materias/${grupo.materias[0]}/ciclo/?carrera_id=${grupo.carrera}`)
          .then(cicloResp => {
            if (cicloResp && cicloResp.ciclo_id) {
              setCicloId(cicloResp.ciclo_id);
            } else {
              setCicloId(null);
            }
          });
      } else {
        setCicloId(null);
      }
    } else {
      setCurrentGrupo(null);
      setCicloId(null);
      form.reset({
        codigo_grupo: "",
        materias: [],
        carrera: 0,
        periodo: 0,
        numero_estudiantes_estimado: 0,
        turno_preferente: "M",
        docente_asignado_directamente: null,
        ciclo_semestral: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGrupo(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentGrupo) {
        // Update existing grupo
        await updateItem<Grupo>(
          "scheduling/grupos/", 
          currentGrupo.grupo_id, 
          values
        );
        toast.success("Grupo actualizado exitosamente");
        // Recargar la página actual
        loadGrupos(pagination.page);
      } else {
        // Create new grupo
        await createItem<Grupo>(
          "scheduling/grupos/", 
          values
        );
        toast.success("Grupo creado exitosamente");
        // Ir a la página 1 para ver el nuevo grupo
        loadGrupos(1);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving grupo:", error);
      toast.error("Error al guardar el grupo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (grupo: Grupo) => {
    setCurrentGrupo(grupo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentGrupo) return;
    
    try {
      await deleteItem("scheduling/grupos/", currentGrupo.grupo_id);
      toast.success("Grupo eliminado exitosamente");
      // Recargar la página actual después de eliminar
      loadGrupos(pagination.page);
    } catch (error) {
      console.error("Error deleting grupo:", error);
      toast.error("Error al eliminar el grupo");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentGrupo(null);
    }
  };

  const getTurnoLabel = (value: string) => {
    return turnos.find(t => t.value === value)?.label || value;
  };

  const columns: Column[] = [
    {
      header: "Código",
      key: "codigo_grupo",
    },
    {
      header: "Materia",
      key: "materias_detalle",
      render: (row) => row.materias_detalle.map(md => md.codigo_materia).join(", ") || "N/A",
    },
    {
      header: "Carrera",
      key: "carrera_detalle",
      render: (row) => row.carrera_detalle?.nombre_carrera || "N/A",
    },
    {
      header: "Período",
      key: "periodo_nombre",
      render: (row) => row.periodo_nombre || "N/A",
    },
    {
      header: "Ciclo",
      key: "ciclo_semestral",
      render: (row) => row.ciclo_semestral ?? "-",
    },
    {
      header: "Estudiantes",
      key: "numero_estudiantes_estimado",
    },
    {
      header: "Turno",
      key: "turno_preferente",
      render: (row) => getTurnoLabel(row.turno_preferente),
    },
    {
      header: "Docente Asignado",
      key: "docente_asignado_directamente_nombre",
      render: (row) => row.docente_asignado_directamente_nombre || "No asignado",
    },
  ];

  // Log para ver el estado de docentes antes del render
  console.log("Docentes cargados:", docentes);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Grupos</h1>
          <p className="text-gray-500">
            {periodoId 
              ? `Grupos del período seleccionado` 
              : "Administre los grupos académicos del sistema"
            }
          </p>
          
          {/* Información del período y carrera seleccionados */}
          {periodoId && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Período:</span>
                <span className="text-blue-600">
                  {periodos.find(p => p.periodo_id.toString() === periodoId)?.nombre_periodo || 'Cargando...'}
                </span>
              </div>
              
              {searchParams.get('carrera') && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Carrera:</span>
                  <span className="text-green-600">
                    {carreras.find(c => c.carrera_id.toString() === searchParams.get('carrera'))?.nombre_carrera || 'Cargando...'}
                  </span>
                </div>
              )}
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => navigate('/admin/periodos-academicos')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Volver a Períodos Académicos
                </button>
                
                {searchParams.get('carrera') && (
                  <button
                    onClick={() => navigate(`/admin/seleccion-carrera?periodo=${periodoId}`)}
                    className="text-green-600 hover:text-green-800 text-sm"
                  >
                    ← Cambiar Carrera
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all"
          disabled={docentes.length === 0}
        >
          + Agregar Grupo
        </button>
      </div>

      <DataTable
        data={grupos}
        columns={columns}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Página {pagination.page} de {Math.ceil(pagination.count / pagination.pageSize)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadGrupos(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadGrupos(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.count / pagination.pageSize)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentGrupo ? "Editar Grupo" : "Nuevo Grupo"}
        form={
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_grupo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="codigo_grupo">Código del Grupo</FormLabel>
                    <FormControl>
                      <Input id="codigo_grupo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carrera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="carrera">Carrera</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger id="carrera">
                          <SelectValue placeholder="Seleccione una carrera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carreras.map((carrera) => (
                          <SelectItem
                            key={carrera.carrera_id}
                            value={carrera.carrera_id.toString()}
                          >
                            {carrera.nombre_carrera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isModalOpen && ciclos.length > 0 && (
                <div className="mb-2">
                  <FormLabel htmlFor="ciclo">Ciclo</FormLabel>
                  <Select
                    onValueChange={value => {
                      setCicloId(Number(value));
                      // Buscar el ciclo seleccionado y actualizar ciclo_semestral
                      const cicloSeleccionado = ciclos.find(c => c.ciclo_id === Number(value));
                      form.setValue("ciclo_semestral", cicloSeleccionado ? cicloSeleccionado.orden : null);
                    }}
                    value={cicloId?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger id="ciclo">
                        <SelectValue placeholder="Seleccione un ciclo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ciclos.sort((a, b) => a.orden - b.orden).map(ciclo => (
                        <SelectItem key={ciclo.ciclo_id} value={ciclo.ciclo_id.toString()}>
                          {ciclo.nombre_ciclo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField
                control={form.control}
                name="materias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="materias">Materias</FormLabel>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {materiasFiltradas.map((materia) => (
                        <div key={materia.materia_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`materia-${materia.materia_id}`}
                            checked={field.value?.includes(materia.materia_id) || false}
                            onCheckedChange={(checked) => {
                              const currentMaterias = field.value || [];
                              if (checked) {
                                field.onChange([...currentMaterias, materia.materia_id]);
                              } else {
                                field.onChange(currentMaterias.filter(id => id !== materia.materia_id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`materia-${materia.materia_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {materia.nombre_materia} ({materia.codigo_materia})
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="periodo">Período</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger id="periodo">
                          <SelectValue placeholder="Seleccione un período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem
                            key={periodo.periodo_id}
                            value={periodo.periodo_id.toString()}
                          >
                            {periodo.nombre_periodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_estudiantes_estimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="numero_estudiantes_estimado">Número de Estudiantes</FormLabel>
                    <FormControl>
                      <Input 
                        id="numero_estudiantes_estimado"
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="turno_preferente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="turno_preferente">Turno Preferente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger id="turno_preferente">
                          <SelectValue placeholder="Seleccione un turno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {turnos.map((turno) => (
                          <SelectItem key={turno.value} value={turno.value}>
                            {turno.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="docente_asignado_directamente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="docente_asignado_directamente">Docente Asignado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "0" ? null : Number(value))}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger id="docente_asignado_directamente">
                          <SelectValue placeholder="Seleccione un docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">No asignar</SelectItem>
                        {docentes.map((docente) => {
                          console.log("Renderizando docente:", docente);
                          return (
                            <SelectItem
                              key={docente.docente_id}
                              value={docente.docente_id.toString()}
                            >
                              {`${docente.nombres} ${docente.apellidos}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Elimina o comenta el bloque del formulario que renderiza ciclo_semestral: */}
              {/* <FormField
                control={form.control}
                name="ciclo_semestral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="ciclo_semestral">Ciclo Semestral</FormLabel>
                    <FormControl>
                      <Input
                        id="ciclo_semestral"
                        type="number"
                        min={1}
                        placeholder="Ej: 1, 2, 3..."
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </form>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
        isValid={form.formState.isValid}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Grupo"
        description="¿Está seguro que desea eliminar este grupo? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Grupos;