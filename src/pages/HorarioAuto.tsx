import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData, PaginatedResponse } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  X,
  Loader2,
  Settings2,
  Wand2
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface GeneracionResponse {
  message: string;
  stats: {
    sesiones_requeridas_total: number;
    sesiones_programadas_total: number;
    asignaciones_exitosas: number;
    grupos_totalmente_programados: number;
    grupos_parcialmente_programados: number;
    grupos_no_programados: number;
  };
  unresolved_conflicts: Array<{
    grupo_id: number;
    grupo_codigo: string;
    materia_nombre: string;
    razon: string;
  }>;
}

const HorarioAuto = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [generacionResult, setGeneracionResult] = useState<GeneracionResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [generacionProgress, setGeneracionProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadPeriodos = async () => {
      setIsLoading(true);
      try {
        const periodosData = await fetchData<PaginatedResponse<Periodo>>("academic-setup/periodos-academicos/?activo=true");
        if (periodosData && periodosData.results.length > 0) {
          setPeriodos(periodosData.results);
          setSelectedPeriodo(periodosData.results[0].periodo_id);
        }
      } catch (error) {
        console.error("Error cargando periodos:", error);
        toast.error("Error al cargar los periodos académicos");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPeriodos();
  }, []);

  // Cleanup de intervalos y timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleGenerarHorario = async () => {
    if (!selectedPeriodo) {
      toast.error("Seleccione un periodo para generar el horario");
      return;
    }
    
    // Limpiar intervalos previos si existen
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsGenerating(true);
    setGeneracionProgress(0);
    
    // Start progress simulation
    progressIntervalRef.current = setInterval(() => {
      setGeneracionProgress(prev => {
        if (prev >= 90) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 800);
    
    try {
      const formData = new FormData();
      formData.append('periodo_id', selectedPeriodo.toString());
      const response = await client.post('scheduling/acciones-horario/generar-horario-automatico/', formData);
      
      setGeneracionResult(response.data);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setGeneracionProgress(100);
      
      // Wait for progress bar to complete, then show modal
      timeoutRef.current = setTimeout(() => {
        setModalOpen(true);
        timeoutRef.current = null;
      }, 500);
      
    } catch (error) {
      console.error("Error generando horario:", error);
      toast.error("Error al generar el horario");
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 bg-gray-100 min-h-screen">
      <PageHeader 
        title="Generación Automática de Horarios" 
        description="Genere horarios automáticamente respetando restricciones y disponibilidad"
      />
      
      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-5">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-5">
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
                
                <div className="pt-4">
                  <Button
                    onClick={handleGenerarHorario}
                    disabled={isGenerating || !selectedPeriodo}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generar Horario Automáticamente
                      </>
                    )}
                  </Button>
                </div>
                
                {isGenerating && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                      <span>Progreso</span>
                      <span>{Math.round(generacionProgress)}%</span>
                    </div>
                    <Progress value={generacionProgress} className="h-2" />
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-5 text-sm space-y-3">
                  <h3 className="font-medium">Consideraciones del algoritmo:</h3>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <p>Respeta la disponibilidad de los docentes</p>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <p>Evita cruces de horarios (mismo docente, mismo aula, mismo grupo)</p>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <p>Intenta cumplir preferencias de turno de los grupos</p>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <p>Aplica restricciones de espacios físicos según tipo y capacidad</p>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <p>Respeta restricciones configuradas en el sistema</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-7">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">Proceso de Generación</h3>
                  <p className="text-sm text-gray-500">
                    Pasos que sigue el algoritmo para generar horarios automáticamente
                  </p>
                </div>
                <Settings2 className="h-6 w-6 text-gray-500" />
              </div>
              
              <div className="space-y-8 py-4">
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full bg-academic-primary w-8 h-8 flex items-center justify-center text-white">
                      1
                    </div>
                    <div className="h-full w-0.5 bg-gray-200 my-2"></div>
                  </div>
                  <div>
                    <h4 className="font-medium">Recopilación de Datos</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      El sistema carga todos los grupos, docentes, aulas y restricciones del periodo seleccionado.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full bg-academic-primary w-8 h-8 flex items-center justify-center text-white">
                      2
                    </div>
                    <div className="h-full w-0.5 bg-gray-200 my-2"></div>
                  </div>
                  <div>
                    <h4 className="font-medium">Análisis de Restricciones</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Procesa la disponibilidad de cada docente, aulas adecuadas según tipo de espacio y capacidad, 
                      y restricciones adicionales configuradas.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full bg-academic-primary w-8 h-8 flex items-center justify-center text-white">
                      3
                    </div>
                    <div className="h-full w-0.5 bg-gray-200 my-2"></div>
                  </div>
                  <div>
                    <h4 className="font-medium">Asignación Inteligente</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Utilizando algoritmos de optimización, asigna cada grupo al mejor horario posible 
                      considerando todas las restricciones.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full bg-academic-primary w-8 h-8 flex items-center justify-center text-white">
                      4
                    </div>
                    <div className="h-full w-0.5 bg-gray-200 my-2"></div>
                  </div>
                  <div>
                    <h4 className="font-medium">Resolución de Conflictos</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Identifica y resuelve conflictos buscando alternativas viables. Si no es posible resolver todos 
                      los conflictos, registra los grupos problemáticos.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full bg-academic-primary w-8 h-8 flex items-center justify-center text-white">
                      5
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Generación Final</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Crea los registros de horarios en el sistema y presenta un reporte detallado con 
                      estadísticas y conflictos no resueltos.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal de resultados */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado de Generación de Horario</DialogTitle>
            <DialogDescription>
              {generacionResult?.message || "Se ha completado el proceso de generación automática"}
            </DialogDescription>
          </DialogHeader>
          
          {generacionResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="rounded-full bg-green-100 p-2 mr-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{generacionResult.stats.grupos_totalmente_programados}</div>
                      <div className="text-xs text-gray-500">Grupos totalmente programados</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="rounded-full bg-yellow-100 p-2 mr-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{generacionResult.stats.grupos_parcialmente_programados}</div>
                      <div className="text-xs text-gray-500">Grupos parcialmente programados</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="rounded-full bg-red-100 p-2 mr-3">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{generacionResult.stats.grupos_no_programados}</div>
                      <div className="text-xs text-gray-500">Grupos no programados</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="rounded-full bg-blue-100 p-2 mr-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{generacionResult.stats.sesiones_requeridas_total}</div>
                      <div className="text-xs text-gray-500">Sesiones requeridas</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="rounded-full bg-green-100 p-2 mr-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{generacionResult.stats.sesiones_programadas_total}</div>
                      <div className="text-xs text-gray-500">Sesiones programadas</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Asignaciones exitosas</span>
                  <span>{generacionResult.stats.asignaciones_exitosas}</span>
                </div>
                <Progress value={generacionResult.stats.sesiones_programadas_total && generacionResult.stats.sesiones_requeridas_total ? (generacionResult.stats.sesiones_programadas_total / generacionResult.stats.sesiones_requeridas_total) * 100 : 0} className="h-2" />
              </div>
              {/* Mostrar errores/conflictos si existen */}
              {generacionResult.unresolved_conflicts && generacionResult.unresolved_conflicts.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-red-700">Conflictos o errores encontrados:</h4>
                  <div className="bg-red-50 rounded-md p-3 max-h-48 overflow-y-auto border border-red-200">
                    <ul className="space-y-2 list-disc pl-5">
                      {generacionResult.unresolved_conflicts.map((conflict, index) => (
                        <li key={index} className="text-sm text-red-800">
                          <span className="font-bold">{conflict.grupo_codigo}</span>: {conflict.materia_nombre} — <span className="italic">{conflict.razon}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-green-700 text-sm font-medium bg-green-50 rounded-md p-3 border border-green-200">
                  ¡Todos los grupos fueron programados exitosamente!
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => setModalOpen(false)} 
              className="mt-2"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isLoading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      )}
    </div>
  );
};

export default HorarioAuto;
