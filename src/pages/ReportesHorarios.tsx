import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  BookOpen,
  Users,
  Building,
  UserSquare,
  Loader2,
  Filter,
  Eye,
  X
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
}

interface Aula {
  espacio_id: number;
  nombre_espacio: string;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  dia_semana: number;
  nombre_bloque?: string;
}

interface Materia {
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface HorarioAsignado {
  horario_id: number;
  grupo: number;
  docente: number;
  espacio: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  materia: number;
  grupo_detalle: Grupo;
  materia_detalle: Materia;
  docente_detalle: Docente;
  espacio_detalle: Aula;
}

interface HorarioCelda {
  bloqueId: number;
  diaId: number;
  materia: string;
  docente: string;
  aula: string;
  grupo: string;
  color: string;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

// Generate a color based on string (for consistent colors per materia/docente)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsla(${hue}, 80%, 85%, 0.85)`;
};

const ReportesHorarios = () => {
  const { user, role } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("grupo");
  const [showPreviewPDF, setShowPreviewPDF] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState<string | null>(null);
  const [selectedHorarioForPDF, setSelectedHorarioForPDF] = useState<number | null>(null);
  
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [horarios, setHorarios] = useState<HorarioAsignado[]>([]);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  
  const [horariosCeldas, setHorariosCeldas] = useState<HorarioCelda[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Persistencia de filtros
  const STORAGE_KEY = 'reportes_horarios_filtros';
  
  // Cargar filtros guardados después de que los datos iniciales se carguen
  useEffect(() => {
    if (periodos.length > 0 && unidades.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.periodo && periodos.some(p => p.periodo_id === parsed.periodo)) {
            setSelectedPeriodo(parsed.periodo);
          }
          if (parsed.unidad && unidades.some(u => u.unidad_id === parsed.unidad)) {
            setSelectedUnidad(parsed.unidad);
          }
          if (parsed.activeTab) {
            setActiveTab(parsed.activeTab);
          }
        } catch (e) {
          console.error('Error loading saved filters:', e);
        }
      }
    }
  }, [periodos.length, unidades.length]);
  
  // Cargar filtros de carrera, grupo, docente, aula cuando sus datos estén disponibles
  useEffect(() => {
    if (carreras.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.carrera && carreras.some(c => c.carrera_id === parsed.carrera)) {
            setSelectedCarrera(parsed.carrera);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }, [carreras.length]);
  
  useEffect(() => {
    if (grupos.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.grupo && grupos.some(g => g.grupo_id === parsed.grupo)) {
            setSelectedGrupo(parsed.grupo);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }, [grupos.length]);
  
  useEffect(() => {
    if (docentes.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.docente && docentes.some(d => d.docente_id === parsed.docente)) {
            setSelectedDocente(parsed.docente);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }, [docentes.length]);
  
  useEffect(() => {
    if (aulas.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.aula && aulas.some(a => a.espacio_id === parsed.aula)) {
            setSelectedAula(parsed.aula);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }, [aulas.length]);
  
  // Guardar filtros cuando cambian
  useEffect(() => {
    const filters = {
      periodo: selectedPeriodo,
      unidad: selectedUnidad,
      carrera: selectedCarrera,
      grupo: selectedGrupo,
      docente: selectedDocente,
      aula: selectedAula,
      activeTab,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [selectedPeriodo, selectedUnidad, selectedCarrera, selectedGrupo, selectedDocente, selectedAula, activeTab]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      try {
        // Load active academic periods (respuesta paginada)
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        // Load time blocks (respuesta NO paginada)
        const bloquesData = await fetchData<BloqueHorario[]>("scheduling/bloques-horarios/");
        if (bloquesData && Array.isArray(bloquesData)) {
          setBloques(bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        } else {
          setBloques([]);
        }
        // Load academic units (respuesta paginada)
        const unidadesResponse = await fetchData<{ results: UnidadAcademica[] }>("academic-setup/unidades-academicas/");
        const unidadesData = unidadesResponse?.results ?? [];
        setUnidades(unidadesData);
        // Selección automática de la primera unidad académica
        if (unidadesData.length > 0 && !selectedUnidad) {
          setSelectedUnidad(unidadesData[0].unidad_id);
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
  
  // Load carreras when unidad changes
  useEffect(() => {
    if (selectedUnidad) {
      const loadCarreras = async () => {
        try {
          // Load carreras (respuesta paginada)
          const carrerasResponse = await fetchData<{ results: Carrera[] }>(`academic-setup/carreras/?unidad=${selectedUnidad}`);
          const carrerasData = carrerasResponse?.results ?? [];
          setCarreras(Array.isArray(carrerasData) ? carrerasData : []);
          // Load aulas for this unidad (respuesta paginada)
          const aulasResponse = await fetchData<{ results: Aula[] }>(`academic-setup/espacios-fisicos/?unidad=${selectedUnidad}`);
          const aulasData = aulasResponse?.results ?? [];
          setAulas(Array.isArray(aulasData) ? aulasData : []);
          // Load docentes para esta unidad (respuesta NO paginada, array plano)
          const docentesResponse = await fetchData<Docente[]>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          setDocentes(Array.isArray(docentesResponse) ? docentesResponse : []);
          setSelectedCarrera(null);
          setSelectedGrupo(null);
          setSelectedAula(null);
          setSelectedDocente(null);
        } catch (error) {
          console.error("Error loading carreras:", error);
          toast.error("Error al cargar las carreras");
        }
      };
      loadCarreras();
    }
  }, [selectedUnidad]);
  
  // Load grupos when carrera changes
  useEffect(() => {
    if (selectedCarrera && selectedPeriodo) {
      const loadGruposYMaterias = async () => {
        try {
          // Load grupos (respuesta paginada)
          const gruposResponse = await fetchData<{ results: Grupo[] }>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          const gruposData = gruposResponse?.results ?? [];
          setGrupos(Array.isArray(gruposData) ? gruposData : []);
          // Load materias for this carrera
          const materiasResponse = await fetchData<{ materias: Materia[] }>(`academic-setup/materias/por-carrera/${selectedCarrera}/`);
          const materiasData = materiasResponse?.materias ?? [];
          setMaterias(Array.isArray(materiasData) ? materiasData : []);
          setSelectedGrupo(null);
        } catch (error) {
          console.error("Error loading grupos/materias:", error);
          toast.error("Error al cargar los grupos y materias");
        }
      };
      loadGruposYMaterias();
    }
  }, [selectedCarrera, selectedPeriodo]);
  
  // Load horarios when filters change
  useEffect(() => {
    if (selectedPeriodo) {
      loadHorarios();
    }
  }, [selectedPeriodo, selectedGrupo, selectedDocente, selectedAula, selectedCarrera, activeTab]);
  
  // Selección automática para docentes
  useEffect(() => {
    if (String(role).toLowerCase() === 'docente' && user && user.docente_id) {
      console.log('Seleccionando docente:', user.docente_id);
      setSelectedDocente(user.docente_id);
      setActiveTab('docente');
    }
  }, [role, user]);
  
  const loadHorarios = async () => {
    setIsLoading(true);
    setHorarios([]); // Limpiar horarios antes de cargar
    setHorariosCeldas([]); // Limpiar celdas

    if (!selectedPeriodo) {
        setIsLoading(false);
        return;
    }

    let endpoint = `scheduling/horarios-asignados/?periodo=${selectedPeriodo}`;
    
    // Construir el endpoint con filtros combinados (no solo uno por tab)
    // Permitir múltiples filtros simultáneos
    if (selectedGrupo) {
        endpoint += `&grupo=${selectedGrupo}`;
    }
    if (selectedDocente) {
        endpoint += `&docente=${selectedDocente}`;
    }
    if (selectedAula) {
        endpoint += `&espacio=${selectedAula}`;
    }
    // Si hay carrera seleccionada, filtrar por grupos de esa carrera
    // Nota: Esto requiere que el backend soporte filtrado por carrera o
    // filtrar en el cliente después de cargar

    try {
      const response = await client.get<HorarioAsignado[]>(endpoint);
      let horariosData = response.data ?? [];
      
      if (!Array.isArray(horariosData)) {
          console.error("La respuesta de la API de horarios no es un array:", horariosData);
          toast.error("Formato de datos de horarios inesperado.");
          setHorarios([]);
      } else {
          // Filtrar por carrera en el cliente si está seleccionada
          // (ya que el backend puede no soportar este filtro directamente)
          if (selectedCarrera && grupos.length > 0) {
            const gruposIds = grupos.map(g => g.grupo_id);
            horariosData = horariosData.filter(h => gruposIds.includes(h.grupo));
          }
          setHorarios(horariosData);
      }

    } catch (error) {
      console.error("Error loading horarios:", error);
      toast.error("No se pudieron cargar los horarios.");
      setHorarios([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportToExcel = () => {
    // Construir los datos para exportar
    const exportData: any[] = [];
    
    // Encabezados
    const headers = ['Hora', ...diasSemana.map(d => d.nombre)];
    exportData.push(headers);

    // Por cada bloque horario, construir una fila
    bloques.forEach(bloque => {
      const row: any[] = [];
      row.push(`${bloque.hora_inicio.slice(0,5)} - ${bloque.hora_fin.slice(0,5)}`);
      diasSemana.forEach(dia => {
        const celda = horariosCeldas.find(h => h.diaId === dia.id && h.bloqueId === bloque.bloque_def_id);
        if (celda) {
          row.push(
            `Materia: ${celda.materia}\nGrupo: ${celda.grupo}\nAula: ${celda.aula}\nDocente: ${celda.docente}`
          );
        } else {
          row.push('');
        }
      });
      exportData.push(row);
    });

    // Crear hoja y libro de Excel
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horario');

    // Generar archivo y descargar
    const periodoName = periodos.find(p => p.periodo_id === selectedPeriodo)?.nombre_periodo || 'periodo';
    const currentDate = new Date().toISOString().slice(0, 10);
    const fileName = `horario_${activeTab}_${periodoName}_${currentDate}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
    toast.success('Horario exportado correctamente');
  };
  
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    
    try {
      // Usar datos reales disponibles para la plantilla
      const materiasEjemplo = materias.slice(0, 3).map(m => m.codigo_materia);
      const docentesEjemplo = docentes.slice(0, 3).map(d => d.codigo_docente);
      const aulasEjemplo = aulas.slice(0, 3).map(a => a.nombre_espacio);
      const gruposEjemplo = grupos.slice(0, 3).map(g => g.codigo_grupo);
      
      const templateData = [
        ['Día', 'Hora Inicio', 'Hora Fin', 'Materia', 'Docente', 'Aula', 'Grupo'],
        ['1', '07:00', '08:30', materiasEjemplo[0] || 'MAT001', docentesEjemplo[0] || 'DOC001', aulasEjemplo[0] || 'AULA-101', gruposEjemplo[0] || 'GRP001'],
        ['2', '08:30', '10:00', materiasEjemplo[1] || 'MAT002', docentesEjemplo[1] || 'DOC002', aulasEjemplo[1] || 'AULA-102', gruposEjemplo[1] || 'GRP002'],
        ['3', '10:00', '11:30', materiasEjemplo[2] || 'MAT003', docentesEjemplo[2] || 'DOC003', aulasEjemplo[2] || 'AULA-103', gruposEjemplo[2] || 'GRP003'],
        ['4', '11:30', '13:00', '', '', '', ''],
        ['5', '13:00', '14:30', '', '', '', ''],
        ['6', '14:30', '16:00', '', '', '', ''],
      ];
      
      // Convertir a CSV
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_horarios.csv';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Plantilla descargada correctamente");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Error al descargar la plantilla");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };
  
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = `
        <div style="padding: 20px;">
          <h1 style="text-align: center; margin-bottom: 20px;">Horario Académico</h1>
          ${printContents}
        </div>
      `;
      
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };
  
  // Función para generar PDF
  const generatePDF = (horarioId?: number) => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Obtener datos del horario a mostrar
      let horariosToShow = horarios;
      if (horarioId) {
        // Si se especifica un horario, filtrar por grupo/docente/aula según el tipo
        const horarioSeleccionado = horarios.find(h => {
          if (activeTab === 'grupo' && h.grupo === horarioId) return true;
          if (activeTab === 'docente' && h.docente === horarioId) return true;
          if (activeTab === 'aula' && h.espacio === horarioId) return true;
          return false;
        });
        if (horarioSeleccionado) {
          // Filtrar todos los horarios del mismo grupo/docente/aula
          if (activeTab === 'grupo') {
            horariosToShow = horarios.filter(h => h.grupo === horarioSeleccionado.grupo);
          } else if (activeTab === 'docente') {
            horariosToShow = horarios.filter(h => h.docente === horarioSeleccionado.docente);
          } else if (activeTab === 'aula') {
            horariosToShow = horarios.filter(h => h.espacio === horarioSeleccionado.espacio);
          }
        }
      }
      
      // Título
      const periodo = periodos.find(p => p.periodo_id === selectedPeriodo);
      const titulo = activeTab === 'grupo' 
        ? `Horario del Grupo: ${grupos.find(g => g.grupo_id === selectedGrupo)?.codigo_grupo || 'N/A'}`
        : activeTab === 'docente'
        ? `Horario del Docente: ${docentes.find(d => d.docente_id === selectedDocente)?.nombres || 'N/A'} ${docentes.find(d => d.docente_id === selectedDocente)?.apellidos || ''}`
        : `Horario del Aula: ${aulas.find(a => a.espacio_id === selectedAula)?.nombre_espacio || 'N/A'}`;
      
      doc.setFontSize(16);
      doc.text('Horario Académico', 148, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(titulo, 148, 22, { align: 'center' });
      if (periodo) {
        doc.text(`Período: ${periodo.nombre_periodo}`, 148, 28, { align: 'center' });
      }
      
      // Preparar datos para la tabla
      const tableData: any[][] = [];
      
      // Ordenar bloques por hora de inicio
      const bloquesOrdenados = [...bloquesUnicos].sort((a, b) => {
        const horaA = a.hora_inicio.split(':').map(Number);
        const horaB = b.hora_inicio.split(':').map(Number);
        const minutosA = horaA[0] * 60 + horaA[1];
        const minutosB = horaB[0] * 60 + horaB[1];
        return minutosA - minutosB;
      });
      
      bloquesOrdenados.forEach(bloque => {
        const row: any[] = [`${bloque.hora_inicio.slice(0, 5)} - ${bloque.hora_fin.slice(0, 5)}`];
        
        diasSemana.forEach(dia => {
          // Buscar celda directamente por diaId y bloqueId
          const celda = horariosCeldas.find(
            h => h.diaId === dia.id && 
            bloques.some(b => b.bloque_def_id === h.bloqueId && 
              b.hora_inicio === bloque.hora_inicio && 
              b.hora_fin === bloque.hora_fin)
          );
          
          if (celda) {
            let texto = celda.materia;
            if (activeTab !== 'grupo') texto += `\nGrupo: ${celda.grupo}`;
            if (activeTab !== 'docente') texto += `\n${celda.docente}`;
            if (activeTab !== 'aula') texto += `\nAula: ${celda.aula}`;
            row.push(texto);
          } else {
            row.push('');
          }
        });
        tableData.push(row);
      });
      
      // Generar tabla
      autoTable(doc, {
        head: [['HORARIO', ...diasSemana.map(d => d.nombre.toUpperCase())]],
        body: tableData,
        startY: 35,
        styles: { 
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { top: 35, left: 10, right: 10 },
        tableWidth: 'wrap',
      });
      
      // Generar y descargar
      const periodoName = periodo?.nombre_periodo || 'periodo';
      const currentDate = new Date().toISOString().slice(0, 10);
      const fileName = `horario_${activeTab}_${periodoName}_${currentDate}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  // Función para vista previa de PDF
  const handlePreviewPDF = (horarioId?: number) => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Misma lógica que generatePDF pero sin descargar
      let horariosToShow = horarios;
      if (horarioId) {
        const horarioSeleccionado = horarios.find(h => {
          if (activeTab === 'grupo' && h.grupo === horarioId) return true;
          if (activeTab === 'docente' && h.docente === horarioId) return true;
          if (activeTab === 'aula' && h.espacio === horarioId) return true;
          return false;
        });
        if (horarioSeleccionado) {
          if (activeTab === 'grupo') {
            horariosToShow = horarios.filter(h => h.grupo === horarioSeleccionado.grupo);
          } else if (activeTab === 'docente') {
            horariosToShow = horarios.filter(h => h.docente === horarioSeleccionado.docente);
          } else if (activeTab === 'aula') {
            horariosToShow = horarios.filter(h => h.espacio === horarioSeleccionado.espacio);
          }
        }
      }
      
      const periodo = periodos.find(p => p.periodo_id === selectedPeriodo);
      const titulo = activeTab === 'grupo' 
        ? `Horario del Grupo: ${grupos.find(g => g.grupo_id === selectedGrupo)?.codigo_grupo || 'N/A'}`
        : activeTab === 'docente'
        ? `Horario del Docente: ${docentes.find(d => d.docente_id === selectedDocente)?.nombres || 'N/A'} ${docentes.find(d => d.docente_id === selectedDocente)?.apellidos || ''}`
        : `Horario del Aula: ${aulas.find(a => a.espacio_id === selectedAula)?.nombre_espacio || 'N/A'}`;
      
      doc.setFontSize(16);
      doc.text('Horario Académico', 148, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(titulo, 148, 22, { align: 'center' });
      if (periodo) {
        doc.text(`Período: ${periodo.nombre_periodo}`, 148, 28, { align: 'center' });
      }
      
      const tableData: any[][] = [];
      const bloquesOrdenados = [...bloquesUnicos].sort((a, b) => {
        const horaA = a.hora_inicio.split(':').map(Number);
        const horaB = b.hora_inicio.split(':').map(Number);
        const minutosA = horaA[0] * 60 + horaA[1];
        const minutosB = horaB[0] * 60 + horaB[1];
        return minutosA - minutosB;
      });
      
      bloquesOrdenados.forEach(bloque => {
        const row: any[] = [`${bloque.hora_inicio.slice(0, 5)} - ${bloque.hora_fin.slice(0, 5)}`];
        diasSemana.forEach(dia => {
          // Buscar bloques que coinciden con esta hora
          const bloquesConEstaHora = bloques.filter(
            b => b.hora_inicio === bloque.hora_inicio && 
                 b.hora_fin === bloque.hora_fin
          );
          
          // Buscar la celda que coincide con este día y alguno de estos bloques
          const celda = horariosCeldas.find(h => {
            if (h.diaId !== dia.id) return false;
            return bloquesConEstaHora.some(b => b.bloque_def_id === h.bloqueId);
          });
          if (celda) {
            let texto = celda.materia;
            if (activeTab !== 'grupo') texto += `\nGrupo: ${celda.grupo}`;
            if (activeTab !== 'docente') texto += `\n${celda.docente}`;
            if (activeTab !== 'aula') texto += `\nAula: ${celda.aula}`;
            row.push(texto);
          } else {
            row.push('');
          }
        });
        tableData.push(row);
      });
      
      autoTable(doc, {
        head: [['HORARIO', ...diasSemana.map(d => d.nombre.toUpperCase())]],
        body: tableData,
        startY: 35,
        styles: { 
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { top: 35, left: 10, right: 10 },
      });
      
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewPDFUrl(url);
      setSelectedHorarioForPDF(horarioId || null);
      setShowPreviewPDF(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Error al generar la vista previa');
    }
  };
  
  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    if (periodos.length > 0) {
      setSelectedPeriodo(periodos[0].periodo_id);
    }
    if (unidades.length > 0) {
      setSelectedUnidad(unidades[0].unidad_id);
    }
    setSelectedCarrera(null);
    setSelectedGrupo(null);
    setSelectedDocente(null);
    setSelectedAula(null);
    setActiveTab('grupo');
    toast.success('Filtros limpiados');
  };
  
  const getHorarioPorDiaBloque = (diaId: number, bloqueId: number): HorarioCelda | null => {
    return horariosCeldas.find(h => h.diaId === diaId && h.bloqueId === bloqueId) || null;
  };
  
  // Procesar los datos para la tabla/grid cuando cambian los horarios
  useEffect(() => {
    if (horarios.length > 0) {
      const celdas: HorarioCelda[] = [];
      for (const horario of horarios) {
        const materia = horario.materia_detalle;
        const docente = horario.docente_detalle;
        const aula = horario.espacio_detalle;
        const grupo = horario.grupo_detalle;

        if (materia) {
          const color = stringToColor(materia.nombre_materia);
          celdas.push({
            bloqueId: horario.bloque_horario,
            diaId: horario.dia_semana,
            materia: materia.nombre_materia,
            docente: docente ? `${docente.nombres} ${docente.apellidos}` : 'N/A',
            aula: aula ? aula.nombre_espacio : 'N/A',
            grupo: grupo ? grupo.codigo_grupo : 'N/A',
            color
          });
        }
      }
      setHorariosCeldas(celdas);
    } else {
      setHorariosCeldas([]);
    }
  }, [horarios]);

  // Agrupar bloques horarios por franja horaria única (ignorando el día)
  // Usar los bloques de los horarios para asegurar que tenemos todos los necesarios
  const bloquesDeHorarios = horarios.map(h => {
    const bloque = bloques.find(b => b.bloque_def_id === h.bloque_horario);
    return bloque;
  }).filter((b): b is BloqueHorario => b !== undefined);
  
  const bloquesUnicos = Array.from(
    new Map(
      [...bloquesDeHorarios, ...bloques].map(b => [`${b.hora_inicio}-${b.hora_fin}`, b])
    ).values()
  ).sort((a, b) => {
    const horaA = a.hora_inicio.split(':').map(Number);
    const horaB = b.hora_inicio.split(':').map(Number);
    const minutosA = horaA[0] * 60 + horaA[1];
    const minutosB = horaB[0] * 60 + horaB[1];
    return minutosA - minutosB;
  });

  // Limpiar horarios solo cuando cambian filtros que requieren recarga completa
  useEffect(() => {
    if (selectedUnidad || selectedCarrera) {
      // No limpiar inmediatamente, dejar que loadHorarios maneje la recarga
    }
  }, [selectedUnidad, selectedCarrera]);

  return (
    <div className="container mx-auto py-6 bg-gray-100 min-h-screen">
      <PageHeader 
        title="Reportes de Horarios" 
        description="Visualice y exporte horarios académicos filtrados por diferentes criterios"
      />
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <Tabs 
            defaultValue="grupo" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grupo" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Por Grupo
                </TabsTrigger>
                <TabsTrigger value="docente" className="flex items-center">
                  <UserSquare className="h-4 w-4 mr-2" />
                  Por Docente
                </TabsTrigger>
                <TabsTrigger value="aula" className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Por Aula
                </TabsTrigger>
              </TabsList>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="flex items-center"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar Plantilla
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePreviewPDF()}
                  disabled={isGeneratingPDF || horarios.length === 0}
                  className="flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa PDF
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                  className="flex items-center"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Exportar a Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                          {periodos.filter(p => p && p.periodo_id != null).map((periodo) => (
                            <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                              {periodo.nombre_periodo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtra los horarios por período académico activo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                          {unidades.filter(u => u && u.unidad_id != null).map((unidad) => (
                            <SelectItem key={unidad.unidad_id} value={unidad.unidad_id.toString()}>
                              {unidad.nombre_unidad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Selecciona la unidad académica para filtrar carreras, docentes y aulas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="carrera">Carrera</Label>
                      <Select 
                        value={selectedCarrera?.toString() || "all"}
                        onValueChange={(value) => setSelectedCarrera(value === "all" ? null : Number(value))}
                        disabled={!selectedUnidad}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar carrera" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las carreras</SelectItem>
                          {carreras.filter(c => c && c.carrera_id != null).map((carrera) => (
                            <SelectItem key={carrera.carrera_id} value={carrera.carrera_id.toString()}>
                              {carrera.nombre_carrera}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtra por carrera específica o muestra todas las carreras de la unidad</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Contador de resultados */}
            {!isLoading && (
              <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
                <span>
                  {horarios.length} horario{horarios.length !== 1 ? 's' : ''} encontrado{horarios.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <TabsContent value="grupo" className="mt-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="grupo">Grupo/Sección</Label>
                      <Select 
                        value={selectedGrupo?.toString() || "all"}
                        onValueChange={(value) => {
                          setSelectedGrupo(value === "all" ? null : Number(value));
                          // No limpiar otros filtros para permitir combinaciones
                        }}
                        disabled={!selectedCarrera}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los grupos</SelectItem>
                          {grupos.filter(g => g && g.grupo_id != null).map((grupo) => {
                            return (
                              <SelectItem key={grupo.grupo_id} value={grupo.grupo_id.toString()}>
                                {grupo.codigo_grupo}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtra los horarios por grupo específico. Puede combinarse con otros filtros.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsContent>
            
            <TabsContent value="docente" className="mt-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="docente">Docente</Label>
                      <Select 
                        value={selectedDocente?.toString() || "all"}
                        onValueChange={(value) => {
                          setSelectedDocente(value === "all" ? null : Number(value));
                          // No limpiar otros filtros para permitir combinaciones
                        }}
                        disabled={String(role).toLowerCase() === 'docente' || !selectedUnidad}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar docente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los docentes</SelectItem>
                          {docentes.filter(d => d && d.docente_id != null).map((docente) => (
                            <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                              {docente.nombres} {docente.apellidos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtra los horarios por docente específico. Puede combinarse con otros filtros.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsContent>
            
            <TabsContent value="aula" className="mt-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="aula">Aula</Label>
                      <Select 
                        value={selectedAula?.toString() || "all"}
                        onValueChange={(value) => {
                          setSelectedAula(value === "all" ? null : Number(value));
                          // No limpiar otros filtros para permitir combinaciones
                        }}
                        disabled={!selectedUnidad}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar aula" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las aulas</SelectItem>
                          {aulas.filter(a => a && a.espacio_id != null).map((aula) => (
                            <SelectItem key={aula.espacio_id} value={aula.espacio_id.toString()}>
                              {aula.nombre_espacio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtra los horarios por aula específica. Puede combinarse con otros filtros.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-academic-primary" />
        </div>
      ) : (
        horarios.length > 0 ? (
          <div ref={printRef} className="bg-white p-4 rounded-md shadow">
            <h3 className="text-xl font-bold mb-4 text-center">
                Horario del {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}: {
                    activeTab === 'grupo' ? grupos.find(g => g.grupo_id === selectedGrupo)?.codigo_grupo :
                    activeTab === 'docente' ? docentes.find(d => d.docente_id === selectedDocente)?.nombres :
                    aulas.find(a => a.espacio_id === selectedAula)?.nombre_espacio
                }
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-600">HORARIO</th>
                    {diasSemana.map(dia => (
                      <th key={dia.id} className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-600">
                        {dia.nombre.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloquesUnicos.length === 0 || horarios.length === 0 ? (
                    <tr>
                      <td colSpan={diasSemana.length + 1} className="text-center text-gray-400 py-8">
                        No hay horarios asignados para la unidad académica seleccionada.
                      </td>
                    </tr>
                  ) : (
                    bloquesUnicos.map((bloque) => (
                      <tr key={`${bloque.hora_inicio}-${bloque.hora_fin}`}>
                        <td className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">
                          {bloque.hora_inicio.slice(0, 5)} - {bloque.hora_fin.slice(0, 5)}
                        </td>
                        {diasSemana.map((dia) => {
                          // Buscar directamente en horariosCeldas usando diaId y bloqueId
                          // Primero encontrar todos los bloques que coinciden con esta hora
                          const bloquesConEstaHora = bloques.filter(
                            b => b.hora_inicio === bloque.hora_inicio && 
                                 b.hora_fin === bloque.hora_fin
                          );
                          
                          // Buscar la celda que coincide con este día y alguno de estos bloques
                          const celda = horariosCeldas.find(h => {
                            if (h.diaId !== dia.id) return false;
                            return bloquesConEstaHora.some(b => b.bloque_def_id === h.bloqueId);
                          });
                          return (
                            <td key={`${dia.id}-${bloque.hora_inicio}-${bloque.hora_fin}`} className="border border-gray-300 h-24 w-40 text-center align-top p-1">
                              {celda ? (
                                <div className="w-full h-full rounded-md p-2 text-left text-xs flex flex-col justify-center" style={{ backgroundColor: celda.color }}>
                                  <div className="font-bold truncate" title={celda.materia}>{celda.materia}</div>
                                  {activeTab !== 'grupo' && <div className="truncate" title={celda.grupo}>Grupo: {celda.grupo}</div>}
                                  {activeTab !== 'docente' && <div className="truncate" title={celda.docente}>{celda.docente}</div>}
                                  {activeTab !== 'aula' && <div className="truncate" title={celda.aula}>Aula: {celda.aula}</div>}
                                </div>
                              ) : (
                                <div className="w-full h-full"></div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !isLoading && <div className="text-center py-10 text-gray-500">No hay horarios asignados para los filtros seleccionados.</div>
        )
      )}
      
      {/* Dialog de vista previa PDF */}
      <Dialog open={showPreviewPDF} onOpenChange={setShowPreviewPDF}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa del PDF</DialogTitle>
            <DialogDescription>
              Revisa el horario antes de descargarlo
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh] overflow-auto">
            {previewPDFUrl && (
              <iframe 
                src={previewPDFUrl} 
                className="w-full h-full border-0"
                title="Vista previa PDF"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewPDF(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                if (previewPDFUrl) {
                  const link = document.createElement('a');
                  link.href = previewPDFUrl;
                  const periodoName = periodos.find(p => p.periodo_id === selectedPeriodo)?.nombre_periodo || 'periodo';
                  const currentDate = new Date().toISOString().slice(0, 10);
                  link.download = `horario_${activeTab}_${periodoName}_${currentDate}.pdf`;
                  link.click();
                  toast.success('PDF descargado correctamente');
                }
                setShowPreviewPDF(false);
              }}
            >
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportesHorarios;
