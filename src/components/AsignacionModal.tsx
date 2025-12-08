import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import client from "@/utils/axiosClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Docente, Aula, HorarioAsignado, BloqueHorario, DisponibilidadDocente, MateriaDetalle, Grupo } from "@/types";

// Las props que el modal necesita para funcionar
interface AsignacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docenteId: number, aulaId: number, diaSemana?: number, bloqueId?: number) => void;
  materiaId: number;
  materiaNombre: string;
  bloqueId: number;
  bloqueNombre: string;
  periodoId: number | null;
  // Pasamos las listas completas para que el modal haga el filtrado
  allPeriodSchedules: HorarioAsignado[];
  aulas: Aula[];
  bloques: BloqueHorario[];
  docentes: Docente[];
  disponibilidades: DisponibilidadDocente[];
  materias: MateriaDetalle[];
  grupo: Grupo | null;
  // Nuevos props para modo edición
  isEditMode?: boolean;
  horarioEditando?: HorarioAsignado | null;
}

export const AsignacionModal = ({
  isOpen,
  onClose,
  onSave,
  materiaId,
  materiaNombre,
  bloqueId: initialBloqueId,
  bloqueNombre: initialBloqueNombre,
  periodoId,
  allPeriodSchedules,
  aulas,
  bloques,
  docentes,
  disponibilidades,
  materias,
  grupo,
  isEditMode = false,
  horarioEditando = null,
}: AsignacionModalProps) => {
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  // Estados para día y bloque cuando está en modo edición
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null);
  
  // Bloque y día actuales (pueden cambiar si está en modo edición)
  const currentBloqueId = isEditMode && selectedBloque ? selectedBloque : initialBloqueId;
  const currentDiaSemana = isEditMode && selectedDia ? selectedDia : (bloques.find(b => b.bloque_def_id === currentBloqueId)?.dia_semana ?? null);
  
  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && horarioEditando) {
        // En modo edición, cargar los valores actuales
        setSelectedDocente(horarioEditando.docente);
        setSelectedAula(horarioEditando.espacio);
        setSelectedDia(horarioEditando.dia_semana);
        setSelectedBloque(horarioEditando.bloque_horario);
      } else {
        // En modo creación, resetear todo
        setSelectedDocente(null);
        setSelectedAula(null);
        setSelectedDia(null);
        setSelectedBloque(null);
      }
    }
  }, [isOpen, isEditMode, horarioEditando]);
  
  // Lógica de filtrado con useMemo para eficiencia
  const availableDocentes = useMemo(() => {
    if (!currentBloqueId || !materiaId || !currentDiaSemana) {
      return [];
    }
    // Encontrar la materia para obtener sus requisitos
    const materiaActual = materias.find(m => m.materia_id === materiaId);
    if (!materiaActual) {
      return [];
    }
    const requiredSpecialtyIds = new Set(
      materiaActual.especialidades_detalle?.map(e => e.especialidad_id) || []
    );
    // 1. Docentes disponibles explícitamente para este bloque y periodo
    const docentesDisponiblesIds = new Set(
      disponibilidades
        .filter(d => d.bloque_horario === currentBloqueId && d.periodo === periodoId && d.esta_disponible && d.dia_semana === currentDiaSemana)
        .map(d => d.docente)
    );
    // 2. Docentes ocupados en este bloque, día y periodo
    // Excluir el horario que se está editando si está en modo edición
    const docentesOcupadosIds = new Set(
      allPeriodSchedules
        .filter(h => {
          const isSameBlockAndDay = h.bloque_horario === currentBloqueId && h.dia_semana === currentDiaSemana && h.periodo === periodoId;
          // Si estamos editando, excluir el horario actual de los conflictos
          if (isEditMode && horarioEditando) {
            return isSameBlockAndDay && h.horario_id !== horarioEditando.horario_id;
          }
          return isSameBlockAndDay;
        })
        .map(h => h.docente)
    );
    // Filtrar la lista completa de docentes
    const docentesFiltrados = docentes.filter(docente => {
      const isAvailable = docentesDisponiblesIds.has(docente.docente_id);
      const isNotBusy = !docentesOcupadosIds.has(docente.docente_id);
      if (requiredSpecialtyIds.size === 0) {
        return isAvailable && isNotBusy;
      }
      const hasRequiredSpecialty = docente.especialidades_detalle?.some(e => 
        requiredSpecialtyIds.has(e.especialidad_id)
      ) || false;
      return isAvailable && isNotBusy && hasRequiredSpecialty;
    });
    return docentesFiltrados;
  }, [currentBloqueId, currentDiaSemana, materiaId, periodoId, disponibilidades, docentes, materias, allPeriodSchedules, bloques, isEditMode, horarioEditando]);

  const availableAulas = useMemo(() => {
    console.log("=== INICIO FILTRADO DE AULAS ===");
    console.log("Parámetros recibidos:");
    console.log("- bloqueId:", currentBloqueId);
    console.log("- diaSemana:", currentDiaSemana);
    console.log("- materiaId:", materiaId);
    console.log("- Total aulas:", aulas.length);
    console.log("- Total horarios del período:", allPeriodSchedules.length);
    
    if(!currentBloqueId || !materiaId || !currentDiaSemana) {
      console.log("❌ Faltan bloqueId, diaSemana o materiaId");
      return [];
    }

    // Encontrar la materia para obtener sus requisitos
    const materiaActual = materias.find(m => m.materia_id === materiaId);
    console.log("📚 Materia encontrada:", materiaActual);
    
    if (!materiaActual) {
      console.log("❌ No se encontró la materia");
      return [];
    }
    
    console.log("🏢 Tipo de espacio requerido:", materiaActual.requiere_tipo_espacio_especifico);
    console.log("🏢 Nombre del tipo requerido:", materiaActual.requiere_tipo_espacio_nombre);
    
    const requiredSpaceTypeId = materiaActual.requiere_tipo_espacio_especifico;

    // Encontrar aulas ocupadas en este bloque y día específico
    // Excluir el horario que se está editando si está en modo edición
    const aulasOcupadasIds = new Set(
      allPeriodSchedules
        .filter(h => {
          const isSameBlockAndDay = h.bloque_horario === currentBloqueId && h.dia_semana === currentDiaSemana;
          // Si estamos editando, excluir el horario actual de los conflictos
          if (isEditMode && horarioEditando) {
            return isSameBlockAndDay && h.horario_id !== horarioEditando.horario_id;
          }
          return isSameBlockAndDay;
        })
        .map(h => h.espacio)
    );
    console.log("🚫 Aulas ocupadas en bloque", currentBloqueId, "día", currentDiaSemana, ":", Array.from(aulasOcupadasIds));

    // Mostrar todas las aulas disponibles con sus tipos
    console.log("📋 Todas las aulas disponibles:");
    aulas.forEach(aula => {
      console.log(`  - ${aula.nombre_espacio} (ID: ${aula.espacio_id}, Tipo: ${aula.tipo_espacio})`);
    });

    // Filtrar la lista completa de aulas
    const aulasFiltradas = aulas.filter(aula => {
      console.log(`\n🏫 Analizando aula: ${aula.nombre_espacio} (ID: ${aula.espacio_id})`);
      console.log(`  - Tipo de aula: ${aula.tipo_espacio}`);
      console.log(`  - Tipo requerido: ${requiredSpaceTypeId}`);
      
      const isNotOccupied = !aulasOcupadasIds.has(aula.espacio_id);
      console.log(`  - No ocupada: ${isNotOccupied}`);
      
      // Si no se requiere tipo, solo chequear si está ocupada
      if (!requiredSpaceTypeId) {
        console.log(`  - ✅ No se requiere tipo específico`);
        const result = isNotOccupied;
        console.log(`  - Resultado final: ${result}`);
        return result;
      }

      // Si se requiere, chequear también el tipo de espacio
      const hasCorrectType = aula.tipo_espacio === requiredSpaceTypeId;
      console.log(`  - Tipo correcto: ${hasCorrectType}`);
      
      const result = isNotOccupied && hasCorrectType;
      console.log(`  - Resultado final: ${result}`);
      
      return result;
    });

    console.log("✅ Aulas filtradas finales:", aulasFiltradas.map(a => a.nombre_espacio));
    
    // Si no hay aulas del tipo requerido, mostrar advertencia
    if (requiredSpaceTypeId && aulasFiltradas.length === 0) {
      console.log("⚠️ ADVERTENCIA: No hay aulas del tipo requerido disponibles");
      console.log(`   - Tipo requerido: ${requiredSpaceTypeId} (${materiaActual.requiere_tipo_espacio_nombre})`);
      console.log(`   - Aulas disponibles: ${aulas.length}`);
      console.log(`   - Tipos de aulas disponibles:`, [...new Set(aulas.map(a => a.tipo_espacio))]);
    }
    
    console.log("=== FIN FILTRADO DE AULAS ===\n");
    return aulasFiltradas;
  }, [currentBloqueId, currentDiaSemana, materiaId, allPeriodSchedules, aulas, materias, isEditMode, horarioEditando]);
  
  const handleSave = () => {
    // Validar que si está en modo edición, tenga día y bloque seleccionados
    if (isEditMode && (!selectedDia || !selectedBloque)) {
      toast.error("Debe seleccionar día y bloque horario para editar");
      return;
    }

    // Nueva validación de turno
    const bloqueActual = bloques.find(b => b.bloque_def_id === currentBloqueId);
    if (grupo && bloqueActual && grupo.turno_preferente) {
      const turno = grupo.turno_preferente.toLowerCase();
      const horaInicio = parseInt(bloqueActual.hora_inicio.split(':')[0], 10);

      const morningRule = turno.includes('mañana') && (horaInicio < 7 || horaInicio >= 13);
      const afternoonRule = turno.includes('tarde') && (horaInicio < 13 || horaInicio >= 18);
      const nightRule = turno.includes('noche') && (horaInicio < 18 || horaInicio > 22);

      if (morningRule || afternoonRule || nightRule) {
        toast.error(`Conflicto de turno: El horario no corresponde al turno preferente (${grupo.turno_preferente}) del grupo.`);
        return;
      }
    }

    if (selectedDocente && selectedAula) {
      // Si está en modo edición, pasar también día y bloque
      if (isEditMode) {
        onSave(selectedDocente, selectedAula, selectedDia ?? undefined, selectedBloque ?? undefined);
      } else {
        onSave(selectedDocente, selectedAula);
      }
    }
  };

  // Verificar si hay problemas con los filtros (solo si hay un bloque y día seleccionados)
  const materiaActual = materias.find(m => m.materia_id === materiaId);
  const hasAulaProblem = currentBloqueId && currentDiaSemana && materiaActual?.requiere_tipo_espacio_especifico && availableAulas.length === 0;
  const hasDocenteProblem = currentBloqueId && currentDiaSemana && materiaActual?.especialidades_detalle?.length > 0 && availableDocentes.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Asignación' : 'Asignar Docente y Aula'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? (
              <>Editando asignación de <span className="font-semibold text-academic-primary">{materiaNombre}</span>.</>
            ) : (
              <>Asignando <span className="font-semibold text-academic-primary">{materiaNombre}</span> en el bloque <span className="font-semibold text-academic-primary">{initialBloqueNombre}</span>.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Mostrar advertencias si hay problemas */}
        {hasAulaProblem && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ <strong>Problema con aulas:</strong> Esta materia requiere aulas de tipo "{materiaActual?.requiere_tipo_espacio_nombre}" pero no hay disponibles.
            </p>
          </div>
        )}
        
        {hasDocenteProblem && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ <strong>Problema con docentes:</strong> Esta materia requiere especialidades específicas pero no hay docentes disponibles con esas especialidades.
            </p>
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          <>
            {/* Selectores de día y bloque solo en modo edición */}
            {isEditMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dia">Día de la Semana</Label>
                  <Select 
                    value={selectedDia?.toString() || ""} 
                    onValueChange={(value) => {
                      const dia = Number(value);
                      setSelectedDia(dia);
                      // Resetear bloque cuando cambia el día
                      setSelectedBloque(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar día" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { id: 1, nombre: "Lunes" },
                        { id: 2, nombre: "Martes" },
                        { id: 3, nombre: "Miércoles" },
                        { id: 4, nombre: "Jueves" },
                        { id: 5, nombre: "Viernes" },
                        { id: 6, nombre: "Sábado" },
                      ].map((dia) => (
                        <SelectItem key={dia.id} value={dia.id.toString()}>
                          {dia.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bloque">Bloque Horario</Label>
                  <Select 
                    value={selectedBloque?.toString() || ""} 
                    onValueChange={(value) => setSelectedBloque(Number(value))}
                    disabled={!selectedDia}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedDia ? "Seleccionar bloque" : "Seleccione primero un día"} />
                    </SelectTrigger>
                    <SelectContent>
                      {bloques
                        .filter(b => b.dia_semana === selectedDia)
                        .map((bloque) => (
                          <SelectItem key={bloque.bloque_def_id} value={bloque.bloque_def_id.toString()}>
                            {bloque.nombre_bloque} ({bloque.hora_inicio} - {bloque.hora_fin})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="docente">Docente Disponible ({availableDocentes.length})</Label>
              <Select onValueChange={(value) => setSelectedDocente(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar docente" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocentes.length > 0 ? (
                    availableDocentes.map(docente => {
                      // Buscar la especialidad relevante para la materia
                      let especialidadRelevante = '';
                      if (materias.length > 0) {
                        const materiaActual = materias.find(m => m.materia_id === materiaId);
                        if (materiaActual && materiaActual.especialidades_detalle.length > 0) {
                          const requiredSpecialtyIds = new Set(materiaActual.especialidades_detalle.map(e => e.especialidad_id));
                          const match = docente.especialidades_detalle.find(e => requiredSpecialtyIds.has(e.especialidad_id));
                          if (match) {
                            especialidadRelevante = match.nombre_especialidad;
                          }
                        }
                      }
                      return (
                        <SelectItem key={docente.docente_id} value={String(docente.docente_id)}>
                          {docente.nombres} {docente.apellidos}
                          {especialidadRelevante && (
                            <span className="text-gray-500 ml-2">
                              ({especialidadRelevante})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No hay docentes disponibles para este bloque.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aula">Aula Disponible ({availableAulas.length})</Label>
              <Select onValueChange={(value) => setSelectedAula(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar aula" />
                </SelectTrigger>
                <SelectContent>
                  {availableAulas.length > 0 ? (
                    availableAulas.map(aula => (
                      <SelectItem key={aula.espacio_id} value={String(aula.espacio_id)}>
                        {aula.nombre_espacio} (Cap: {aula.capacidad})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                        No hay aulas disponibles para este bloque.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={
              !selectedDocente || 
              !selectedAula || 
              (isEditMode && (!selectedDia || !selectedBloque))
            }
          >
            {isEditMode ? 'Guardar Cambios' : 'Guardar Asignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 