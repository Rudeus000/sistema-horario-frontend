import { useState, useEffect } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData, getItemById } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Calendar, Clock, BookOpen, Building, Users, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MateriasPanel from "@/components/MateriasPanel";
import HorarioGrid from "@/components/HorarioGrid";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { AsignacionModal } from "@/components/AsignacionModal";
import {
  UnidadAcademica,
  CarreraDetalle,
  MateriaDetalle,
  Grupo,
  Docente,
  Aula,
  BloqueHorario,
  Periodo,
  HorarioAsignado,
  DisponibilidadDocente,
  AsignacionPendiente,
} from "@/types";

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

const HorarioManual = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [carreras, setCarreras] = useState<CarreraDetalle[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [materias, setMaterias] = useState<MateriaDetalle[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [horarios, setHorarios] = useState<HorarioAsignado[]>([]);
  const [allPeriodSchedules, setAllPeriodSchedules] = useState<HorarioAsignado[]>([]);
  const [allPeriodAvailabilities, setAllPeriodAvailabilities] = useState<DisponibilidadDocente[]>([]);
  const [disponibilidadDocentes, setDisponibilidadDocentes] = useState<DisponibilidadDocente[]>([]);
  
  // Estado para el modal de asignación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [asignacionPendiente, setAsignacionPendiente] = useState<AsignacionPendiente | null>(null);
  
  // Estado para edición de horario
  const [horarioEditando, setHorarioEditando] = useState<HorarioAsignado | null>(null);

  // Selected values
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  
  // Assignment form values
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load active periods (respuesta paginada)
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        // Load academic units (respuesta paginada)
        const unidadesResponse = await fetchData<{ results: UnidadAcademica[] }>("academic-setup/unidades-academicas/");
        const unidadesData = unidadesResponse?.results ?? [];
        if (unidadesData.length > 0) {
          setUnidades(unidadesData);
        }
        // Load time blocks (respuesta NO paginada)
        const bloquesData = await fetchData<BloqueHorario[]>("scheduling/bloques-horarios/");
        if (bloquesData) {
          setBloques(bloquesData);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Load ALL schedules for the selected period to check for conflicts
  useEffect(() => {
    if (selectedPeriodo) {
      const loadAllDataForPeriod = async () => {
        // Cargar todos los horarios asignados en el período
        const allHorariosData = await fetchData<HorarioAsignado[]>(`scheduling/horarios-asignados/?periodo=${selectedPeriodo}`);
        setAllPeriodSchedules(allHorariosData ?? []);

        // Cargar todas las disponibilidades de docentes en el período
        const allAvailabilitiesData = await fetchData<DisponibilidadDocente[]>(`scheduling/disponibilidad-docentes/?periodo=${selectedPeriodo}`);
        setAllPeriodAvailabilities(allAvailabilitiesData ?? []);
      }
      loadAllDataForPeriod();
    }
  }, [selectedPeriodo]);
  
  // Load carreras when unidad changes
  useEffect(() => {
    if (selectedUnidad) {
      const loadCarreras = async () => {
        setIsLoading(true);
        try {
          // Load carreras (respuesta paginada)
          const carrerasResponse = await fetchData<{ results: CarreraDetalle[] }>(`academic-setup/carreras/?unidad=${selectedUnidad}`);
          const carrerasData = carrerasResponse?.results ?? [];
          setCarreras(carrerasData);
          setSelectedCarrera(null);
          setGrupos([]);
          setSelectedGrupo(null);
        } catch (error) {
          console.error("Error loading carreras:", error);
          toast.error("Error al cargar las carreras");
        } finally {
          setIsLoading(false);
        }
      };
      loadCarreras();
    }
  }, [selectedUnidad]);
  
  // Load grupos when carrera and periodo changes
  useEffect(() => {
    if (selectedCarrera && selectedPeriodo) {
      const loadGrupos = async () => {
        setIsLoading(true);
        try {
          // Load grupos (respuesta paginada)
          const gruposResponse = await fetchData<{ results: Grupo[] }>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          const gruposData = gruposResponse?.results ?? [];
          setGrupos(gruposData);
          setSelectedGrupo(null);
          // Load materias for this carrera (respuesta paginada)
          const materiasResponse = await fetchData<{ results: MateriaDetalle[] }>(`academic-setup/materias/?carrera=${selectedCarrera}`);
          const materiasData = materiasResponse?.results ?? [];
          setMaterias(materiasData);
        } catch (error) {
          console.error("Error loading grupos and materias:", error);
          toast.error("Error al cargar los grupos y materias");
        } finally {
          setIsLoading(false);
        }
      };
      loadGrupos();
    }
  }, [selectedCarrera, selectedPeriodo]);
  
  // Load aulas, docentes, and existing horarios when unidad and grupo are selected
  useEffect(() => {
    if (selectedUnidad && selectedGrupo && selectedPeriodo) {
      const loadAsignacionData = async () => {
        setIsLoading(true);
        try {
          // Función para cargar todas las páginas de aulas
          const loadAllAulas = async (unidadId: number): Promise<Aula[]> => {
            let allAulas: Aula[] = [];
            let nextUrl = `academic-setup/espacios-fisicos/?unidad=${unidadId}`;
            
            while (nextUrl) {
              try {
                const response = await client.get(nextUrl);
                const data = response.data;
                
                if (data.results) {
                  allAulas = [...allAulas, ...data.results];
                }
                
                // Verificar si hay más páginas
                nextUrl = data.next ? data.next.replace('http://localhost:8000/api/', '') : null;
                
                console.log(`[Aulas] Cargadas ${data.results?.length || 0} aulas de esta página. Total acumulado: ${allAulas.length}`);
              } catch (error: unknown) {
                console.error("Error cargando página de aulas:", error);
                break;
              }
            }
            
            console.log(`[Aulas] Total de aulas cargadas: ${allAulas.length}`);
            return allAulas;
          };

          // Load all classrooms for this unit (todas las páginas)
          const aulasData = await loadAllAulas(selectedUnidad);
          setAulas(aulasData);
          
          // Load teachers for this unit (respuesta como array directo)
          const docentesResponse = await fetchData<Docente[]>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          console.log("[Depuración] Respuesta de la API de docentes:", docentesResponse);
          if (Array.isArray(docentesResponse) && docentesResponse.length > 0) {
            setDocentes(docentesResponse);
          } else {
            // Si la respuesta es vacía, no vaciar el estado, solo mostrar advertencia
            console.warn("[Depuración] La API devolvió un array vacío de docentes. Manteniendo el estado actual.");
          }
          // Load existing schedules for this grupo and periodo (NO paginada)
          const horariosData = await fetchData<HorarioAsignado[]>(`scheduling/horarios-asignados/?grupo=${selectedGrupo}&periodo=${selectedPeriodo}`);
          setHorarios(horariosData ?? []);
          // Reset selection form
          setSelectedDocente(null);
          setSelectedAula(null);
          setSelectedDia(null);
          setSelectedBloque(null);
          setValidationError(null);
        } catch (error) {
          console.error("Error loading assignment data:", error);
          toast.error("Error al cargar los datos para asignación");
        } finally {
          setIsLoading(false);
        }
      };
      loadAsignacionData();
    }
  }, [selectedUnidad, selectedGrupo, selectedPeriodo]);
  
  // Load teacher availability when teacher and period are selected
  useEffect(() => {
    if (selectedDocente && selectedPeriodo) {
      const loadDisponibilidad = async () => {
        try {
          // Load disponibilidad (respuesta NO paginada)
          const disponibilidadData = await fetchData<DisponibilidadDocente[]>(`scheduling/disponibilidad-docentes/?docente=${selectedDocente}&periodo=${selectedPeriodo}`);
          setDisponibilidadDocentes(disponibilidadData ?? []);
        } catch (error) {
          console.error("Error loading teacher availability:", error);
          toast.error("Error al cargar la disponibilidad del docente");
        }
      };
      loadDisponibilidad();
    }
  }, [selectedDocente, selectedPeriodo]);
  
  // Resetear el bloque horario cuando el día cambia
  useEffect(() => {
    setSelectedBloque(null);
  }, [selectedDia]);
  
  // Efecto para cargar docentes, aulas y bloques faltantes tras cargar horarios
  useEffect(() => {
    if (horarios.length === 0) return;

    // Docentes faltantes
    const docenteIdsEnHorarios = Array.from(new Set(horarios.map(h => h.docente)));
    const docenteIdsLocales = new Set(docentes.map(d => d.docente_id));
    const docentesFaltantes = docenteIdsEnHorarios.filter(id => !docenteIdsLocales.has(id));

    // Aulas faltantes
    const aulaIdsEnHorarios = Array.from(new Set(horarios.map(h => h.espacio)));
    const aulaIdsLocales = new Set(aulas.map(a => a.espacio_id));
    const aulasFaltantes = aulaIdsEnHorarios.filter(id => !aulaIdsLocales.has(id));

    // Bloques faltantes
    const bloqueIdsEnHorarios = Array.from(new Set(horarios.map(h => h.bloque_horario)));
    const bloqueIdsLocales = new Set(bloques.map(b => b.bloque_def_id));
    const bloquesFaltantes = bloqueIdsEnHorarios.filter(id => !bloqueIdsLocales.has(id));

    // Función para cargar y agregar los faltantes
    const cargarFaltantes = async () => {
      // Docentes
      for (const id of docentesFaltantes) {
        const docente = await getItemById<Docente>("users/docentes/", id);
        if (docente) setDocentes(prev => [...prev, docente]);
      }
      // Aulas
      for (const id of aulasFaltantes) {
        const aula = await getItemById<Aula>("academic-setup/espacios-fisicos/", id);
        if (aula) setAulas(prev => [...prev, aula]);
      }
      // Bloques
      for (const id of bloquesFaltantes) {
        const bloque = await getItemById<BloqueHorario>("scheduling/bloques-horarios/", id);
        if (bloque) setBloques(prev => [...prev, bloque]);
      }
    };

    cargarFaltantes();
    // Solo cuando cambian los horarios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horarios]);
  
  // Efecto para cargar datos faltantes de TODOS los horarios del período
  useEffect(() => {
    if (allPeriodSchedules.length === 0) return;

    const allData = {
      docentes: new Map(docentes.map(d => [d.docente_id, d])),
      aulas: new Map(aulas.map(a => [a.espacio_id, a])),
      materias: new Map(materias.map(m => [m.materia_id, m])),
      bloques: new Map(bloques.map(b => [b.bloque_def_id, b])),
    };

    const missing = {
      docentes: new Set<number>(),
      aulas: new Set<number>(),
      materias: new Set<number>(),
      bloques: new Set<number>(),
    };

    allPeriodSchedules.forEach(h => {
      if (!allData.docentes.has(h.docente)) missing.docentes.add(h.docente);
      if (!allData.aulas.has(h.espacio)) missing.aulas.add(h.espacio);
      if (!allData.materias.has(h.materia)) missing.materias.add(h.materia);
      if (!allData.bloques.has(h.bloque_horario)) missing.bloques.add(h.bloque_horario);
    });

    const fetchMissingData = async () => {
      const fetchPromises = [
        ...Array.from(missing.docentes).map(id => getItemById<Docente>("users/docentes/", id).then(d => d && setDocentes(prev => [...prev, d]))),
        ...Array.from(missing.aulas).map(id => getItemById<Aula>("academic-setup/espacios-fisicos/", id).then(a => a && setAulas(prev => [...prev, a]))),
        ...Array.from(missing.materias).map(id => getItemById<MateriaDetalle>("academic-setup/materias/", id).then(m => m && setMaterias(prev => [...prev, m]))),
        ...Array.from(missing.bloques).map(id => getItemById<BloqueHorario>("scheduling/bloques-horarios/", id).then(b => b && setBloques(prev => [...prev, b]))),
      ];
      await Promise.all(fetchPromises);
    };

    fetchMissingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPeriodSchedules]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('DragEnd', { active, over });
    // 'active' es el elemento arrastrado (materia)
    // 'over' es el área donde se soltó (celda/bloque)
    if (over && active.id && over.id) {
      const materiaId = Number(String(active.id).replace('materia-', ''));
      const bloqueId = Number(over.id);

      if (isNaN(materiaId) || isNaN(bloqueId) || bloqueId === 0) {
        console.error("IDs de materia o bloque no válidos.");
        return;
      }
      
      // Guardamos la información y abrimos el modal
      setAsignacionPendiente({ materiaId, bloqueId });
      setIsModalOpen(true);

      console.log(`Abriendo modal para asignar Materia ID: ${materiaId} a Bloque ID: ${bloqueId}`);
    }
  };
  
  const handleSaveAsignacion = async (docenteId: number, aulaId: number) => {
    if (!asignacionPendiente || !selectedGrupo || !selectedPeriodo) {
      toast.error("Faltan datos para la asignación.");
      return;
    }

    const { materiaId, bloqueId } = asignacionPendiente;

    const bloqueActual = bloques.find(b => b.bloque_def_id === bloqueId);
    if (!bloqueActual) {
      toast.error("No se pudo encontrar la información del bloque horario.");
      return;
    }

    setIsSaving(true);
    
    try {
      const nuevaAsignacion = {
        grupo: selectedGrupo,
        materia: materiaId,
        docente: docenteId,
        espacio: aulaId,
        periodo: selectedPeriodo,
        dia_semana: bloqueActual.dia_semana,
        bloque_horario: bloqueId,
      };
      
      const response = await client.post('scheduling/horarios-asignados/', nuevaAsignacion);
      
      const horarioCreado: HorarioAsignado = response.data;

      // Add to local state
      setHorarios([...horarios, horarioCreado]);
      setAllPeriodSchedules([...allPeriodSchedules, horarioCreado]);
      
      toast.success("Horario asignado correctamente");
      
    } catch (error: unknown) {
      console.error("Error asignando horario:", error);
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorMsg = axiosError?.response?.data?.detail || "Error al asignar el horario.";
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
      setIsModalOpen(false);
      setAsignacionPendiente(null);
    }
  }
  
  // Función para abrir el modal en modo edición
  const handleEditarHorario = (horario: HorarioAsignado) => {
    setHorarioEditando(horario);
    setAsignacionPendiente({ materiaId: horario.materia, bloqueId: horario.bloque_horario });
    setIsModalOpen(true);
  };

  // Función para guardar la edición
  const handleSaveEdicion = async (docenteId: number, aulaId: number, diaSemana?: number, bloqueId?: number) => {
    if (!horarioEditando || !selectedGrupo || !selectedPeriodo) {
      toast.error("Faltan datos para la edición.");
      return;
    }
    
    // Si se proporcionaron día y bloque, usarlos; si no, usar los valores actuales
    const nuevoDiaSemana = diaSemana ?? horarioEditando.dia_semana;
    const nuevoBloqueId = bloqueId ?? horarioEditando.bloque_horario;
    
    const bloqueActual = bloques.find(b => b.bloque_def_id === nuevoBloqueId);
    if (!bloqueActual) {
      toast.error("No se pudo encontrar la información del bloque horario.");
      return;
    }
    
    setIsSaving(true);
    try {
      const actualizacion = {
        docente: docenteId,
        espacio: aulaId,
        bloque_horario: nuevoBloqueId,
        dia_semana: nuevoDiaSemana,
      };
      const response = await client.patch(`scheduling/horarios-asignados/${horarioEditando.horario_id}/`, actualizacion);
      const horarioActualizado: HorarioAsignado = response.data;
      setHorarios(horarios.map(h => h.horario_id === horarioActualizado.horario_id ? horarioActualizado : h));
      setAllPeriodSchedules(allPeriodSchedules.map(h => h.horario_id === horarioActualizado.horario_id ? horarioActualizado : h));
      toast.success("Horario editado correctamente");
    } catch (error) {
      console.error("Error editando horario:", error);
      toast.error("Error al editar el horario");
    } finally {
      setIsSaving(false);
      setIsModalOpen(false);
      setAsignacionPendiente(null);
      setHorarioEditando(null);
    }
  };
  
  const getMateriaPorGrupo = (grupoId: number): MateriaDetalle | undefined => {
    const grupo = grupos.find(g => g.grupo_id === grupoId);
    return grupo?.materias_detalle.find(m => m.materia_id === grupo.materias[0]);
  };
  
  const getMateriaHorasTotales = (materiaId: number): number => {
    const materia = materias.find(m => m.materia_id === materiaId);
    if (!materia) return 0;
    
    return materia.horas_academicas_teoricas + materia.horas_academicas_practicas;
  };
  
  const getHorasAsignadasGrupo = (grupoId: number): number => {
    return horarios.filter(h => h.grupo === grupoId).length;
  };
  
  const isDocenteDisponible = (docenteId: number, diaId: number, bloqueId: number): boolean => {
    const disponibilidad = disponibilidadDocentes.find(
      d => d.docente === docenteId && d.dia_semana === diaId && d.bloque_horario === bloqueId
    );
    
    return disponibilidad ? disponibilidad.esta_disponible : false;
  };
  
  const hasConflicto = (diaId: number, bloqueId: number): boolean => {
    // Check if the teacher is already assigned at this time in ANY group
    const docenteOcupado = allPeriodSchedules.some(
      h => h.docente === selectedDocente && h.dia_semana === diaId && h.bloque_horario === bloqueId
    );
    
    // Check if the classroom is already occupied at this time by ANY group
    const aulaOcupada = allPeriodSchedules.some(
      h => h.espacio === selectedAula && h.dia_semana === diaId && h.bloque_horario === bloqueId
    );
    
    return docenteOcupado || aulaOcupada;
  };
  
  const validateAsignacion = (): boolean => {
    if (!selectedGrupo || !selectedDocente || !selectedAula || !selectedDia || !selectedBloque || !selectedPeriodo) {
      setValidationError("Todos los campos son obligatorios");
      return false;
    }
    
    // Check if there's already a schedule for this grupo, day and block
    const existeHorario = horarios.some(
      h => h.grupo === selectedGrupo && h.dia_semana === selectedDia && h.bloque_horario === selectedBloque
    );
    
    if (existeHorario) {
      setValidationError("Este grupo ya tiene un horario asignado en este día y bloque");
      return false;
    }
    
    // Check if the teacher is available at this time
    if (!isDocenteDisponible(selectedDocente, selectedDia, selectedBloque)) {
      setValidationError("El docente no está disponible en este horario");
      return false;
    }
    
    // Check if there's a conflict with teacher or classroom
    if (hasConflicto(selectedDia, selectedBloque)) {
      setValidationError("El docente o el aula ya están asignados en este horario");
      return false;
    }
    
    // Check cycle-based time restrictions (simplified version)
    const grupo = grupos.find(g => g.grupo_id === selectedGrupo);
    const bloque = bloques.find(b => b.bloque_def_id === selectedBloque);
    
    if (grupo && bloque) {
      const ciclo = Math.ceil(grupo.carrera_detalle.horas_totales_curricula / 2); // Simplified calculation
      const horaInicio = parseInt(bloque.hora_inicio.split(':')[0]);
      
      if (ciclo <= 3 && (horaInicio < 7 || horaInicio > 13)) {
        setValidationError("Los primeros ciclos (1-3) solo pueden tener clases entre 7:00 y 13:00");
        return false;
      } else if (ciclo >= 4 && ciclo <= 6 && (horaInicio < 13 || horaInicio > 18)) {
        setValidationError("Los ciclos intermedios (4-6) solo pueden tener clases entre 13:00 y 18:00");
        return false;
      } else if (ciclo >= 7 && (horaInicio < 18 || horaInicio > 22)) {
        setValidationError("Los ciclos superiores (7+) solo pueden tener clases entre 18:00 y 22:00");
        return false;
      }
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleAsignar = async () => {
    if (!validateAsignacion()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const grupoActual = grupos.find(g => g.grupo_id === selectedGrupo);
      const materiaId = grupoActual?.materias_detalle?.[0]?.materia_id;

      if (!materiaId) {
        toast.error("No se pudo encontrar la materia para este grupo.");
        setIsSaving(false);
        return;
      }

      const nuevaAsignacion = {
        grupo: selectedGrupo,
        materia: materiaId,
        docente: selectedDocente,
        espacio: selectedAula,
        periodo: selectedPeriodo,
        dia_semana: selectedDia,
        bloque_horario: selectedBloque
      };
      
      const response = await client.post('scheduling/horarios-asignados/', nuevaAsignacion);
      
      // Construir el objeto local a partir de la respuesta del backend
      const horarioCreado: HorarioAsignado = {
        horario_id: response.data.horario_id,
        grupo: response.data.grupo,
        materia: response.data.materia,
        docente: response.data.docente,
        espacio: response.data.espacio,
        periodo: response.data.periodo,
        dia_semana: response.data.dia_semana,
        bloque_horario: response.data.bloque_horario,
      };
      
      // Add to local state
      setHorarios([...horarios, horarioCreado]);
      setAllPeriodSchedules([...allPeriodSchedules, horarioCreado]);
      
      toast.success("Horario asignado correctamente");
      
      // Reset form
      setSelectedDia(null);
      setSelectedBloque(null);
    } catch (error) {
      console.error("Error asignando horario:", error);
      toast.error("Error al asignar el horario");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteHorario = async (horarioId: number) => {
    if (!confirm("¿Está seguro de eliminar esta asignación de horario?")) {
      return;
    }
    
    try {
      await client.delete(`scheduling/horarios-asignados/${horarioId}/`);
      
      // Remove from local state
      setHorarios(horarios.filter(h => h.horario_id !== horarioId));
      setAllPeriodSchedules(allPeriodSchedules.filter(h => h.horario_id !== horarioId));
      
      toast.success("Horario eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando horario:", error);
      toast.error("Error al eliminar el horario");
    }
  };
  
  // Log para depuración de cambios en selección y docentes
  useEffect(() => {
    console.log("[Depuración] selectedUnidad:", selectedUnidad, "selectedGrupo:", selectedGrupo, "docentes:", docentes);
  }, [selectedUnidad, selectedGrupo, docentes]);
  
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-2 md:px-6 py-6 bg-gray-100 min-h-screen">
      <PageHeader 
        title="Asignación Manual de Horarios" 
        description="Configure manualmente los horarios para grupos y docentes"
      />
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid md:grid-cols-12 gap-4 md:gap-6">
          {/* Filtros y selección */}
          <div className="md:col-span-3">
            <Card>
              <CardContent className="p-4 md:p-6 space-y-4">
                <h3 className="text-lg font-medium">Selección</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="periodo">Periodo Académico</Label>
                    <Select 
                      value={selectedPeriodo?.toString() || ""}
                      onValueChange={(value) => setSelectedPeriodo(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                            {periodo.nombre_periodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="unidad">Unidad Académica</Label>
                    <Select 
                      value={selectedUnidad?.toString() || ""}
                      onValueChange={(value) => setSelectedUnidad(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent>
                         {unidades
                          .filter((unidad) => unidad?.unidad_id !== undefined)
                            .map((unidad) => (
                              <SelectItem key={unidad.unidad_id} value={unidad.unidad_id.toString()}>
                              {unidad.nombre_unidad}
                              </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="carrera">Carrera</Label>
                    <Select 
                      value={selectedCarrera?.toString() || ""}
                      onValueChange={(value) => setSelectedCarrera(Number(value))}
                      disabled={!selectedUnidad}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar carrera" />
                      </SelectTrigger>
                      <SelectContent>
                        {carreras.map((carrera) => (
                          <SelectItem key={carrera.carrera_id} value={carrera.carrera_id.toString()}>
                            {carrera.nombre_carrera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="grupo">Grupo/Sección</Label>
                    <Select 
                      value={selectedGrupo?.toString() || ""}
                      onValueChange={(value) => setSelectedGrupo(Number(value))}
                      disabled={!selectedCarrera || !selectedPeriodo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((grupo) => (
                          <SelectItem key={grupo.grupo_id} value={grupo.grupo_id.toString()}>
                            {grupo.codigo_grupo} - {grupo.materias_detalle?.map(m => m.nombre_materia).join(', ') || '(Sin materias asignadas)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedGrupo && (
                  <div className="bg-gray-50 p-4 rounded-md mt-4">
                    <h4 className="font-medium mb-2">Información del Grupo</h4>
                    
                    {(() => {
                      const grupo = grupos.find(g => g.grupo_id === selectedGrupo);
                      
                      if (!grupo) {
                        return <p>No se encontró información del grupo.</p>;
                      }
                      
                      const materiaPrincipal = grupo.materias_detalle?.[0];
                      if (!materiaPrincipal) {
                        return <p>Este grupo no tiene materias asignadas.</p>;
                      }

                      const horasTotales = materiaPrincipal.horas_academicas_teoricas + materiaPrincipal.horas_academicas_practicas;
                      const horasAsignadas = getHorasAsignadasGrupo(grupo.grupo_id);
                      
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-academic-primary" />
                            <span>{materiaPrincipal.nombre_materia}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-academic-primary" />
                            <span>Horas necesarias: {horasTotales} ({materiaPrincipal.horas_academicas_teoricas} teóricas + {materiaPrincipal.horas_academicas_practicas} prácticas)</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-academic-primary" />
                            <span>Horas asignadas: {horasAsignadas} de {horasTotales}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-academic-primary" />
                            <span>Estudiantes estimados: {grupo.numero_estudiantes_estimado}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-academic-primary" />
                            <span>Turno preferente: {grupo.turno_preferente}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Formulario de asignación */}
          <div className="md:col-span-9">
            <Card className="mb-6">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-lg font-medium mb-4">Diseñador de Horario</h3>
                {selectedGrupo ? (
                  <div className="grid grid-cols-12 gap-2 md:gap-4">
                    {/* Panel de Materias */}
                    <div className="col-span-12 md:col-span-3">
                      <MateriasPanel grupo={grupos.find(g => g.grupo_id === selectedGrupo) || null} />
                    </div>
                    {/* Cuadrícula del Horario */}
                    <div className="col-span-12 md:col-span-9">
                      <HorarioGrid 
                        bloques={bloques}
                        horarios={allPeriodSchedules}
                        materias={materias}
                        docentes={docentes}
                        aulas={aulas}
                        selectedGrupo={grupos.find(g => g.grupo_id === selectedGrupo) || null}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Seleccione un grupo para comenzar a diseñar el horario</p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Horarios asignados */}
            {selectedGrupo && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Horarios Asignados</h3>
                  
                  {horarios.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b">
                            <th className="p-3 text-left">Día</th>
                            <th className="p-3 text-left">Materia</th>
                            <th className="p-3 text-left">Horario</th>
                            <th className="p-3 text-left">Docente</th>
                            <th className="p-3 text-left">Aula</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {horarios.map((horario) => {
                            const dia = diasSemana.find(d => d.id === horario.dia_semana);
                            const bloque = bloques.find(b => b.bloque_def_id === horario.bloque_horario);
                            const docente = docentes.find(d => d.docente_id === horario.docente);
                            const aula = aulas.find(a => a.espacio_id=== horario.espacio);
                            const grupo = grupos.find(g => g.grupo_id === horario.grupo);
                            // Corrección: buscar la materia por el ID de la asignación
                            const materia = grupo?.materias_detalle?.find(m => m.materia_id === horario.materia)?.nombre_materia
                              || materias.find(m => m.materia_id === horario.materia)?.nombre_materia
                              || 'N/A';
                            return (
                              <tr key={horario.horario_id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{dia?.nombre || `ID: ${horario.dia_semana}`}</td>
                                <td className="p-3">{materia}</td>
                                <td className="p-3">{bloque ? bloque.nombre_bloque : `ID: ${horario.bloque_horario}`}</td>
                                <td className="p-3">{docente ? `${docente.nombres} ${docente.apellidos}` : `ID: ${horario.docente}`}</td>
                                <td className="p-3">{aula ? aula.nombre_espacio : `ID: ${horario.espacio}`}</td>
                                <td className="p-3 text-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditarHorario(horario)}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 mr-2"
                                  >
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteHorario(horario.horario_id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No hay horarios asignados para este grupo</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DndContext>
      {/* Modal de asignación */}
      {asignacionPendiente && (() => {
        const grupoSeleccionado = grupos.find(g => g.grupo_id === selectedGrupo);
        const materiaEnGrupo = grupoSeleccionado?.materias_detalle?.find(m => m.materia_id === asignacionPendiente.materiaId);
        const materiasDelGrupo = grupoSeleccionado?.materias_detalle ?? [];
        const isEditMode = !!horarioEditando;
        return (
          <AsignacionModal 
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setHorarioEditando(null); setAsignacionPendiente(null); }}
            onSave={isEditMode ? handleSaveEdicion : handleSaveAsignacion}
            materiaId={asignacionPendiente.materiaId}
            materiaNombre={materiaEnGrupo?.nombre_materia ?? 'Desconocida'}
            bloqueId={asignacionPendiente.bloqueId}
            bloqueNombre={
              bloques.find(b => b.bloque_def_id === asignacionPendiente.bloqueId)?.nombre_bloque ?? 'Desconocido'
            }
            periodoId={selectedPeriodo}
            allPeriodSchedules={allPeriodSchedules}
            aulas={aulas}
            bloques={bloques}
            docentes={docentes}
            disponibilidades={allPeriodAvailabilities}
            materias={materiasDelGrupo}
            grupo={selectedGrupo ? grupos.find(g => g.grupo_id === selectedGrupo) ?? null : null}
            isEditMode={isEditMode}
            horarioEditando={horarioEditando}
          />
        );
      })()}

      {/* Loader */}
      {(isLoading || isSaving) && (
        <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      )}
    </div>
  );
};

export default HorarioManual;
