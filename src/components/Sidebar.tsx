import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  ClipboardList, 
  ClipboardCheck,
  LogIn,
  Building,
  Settings,
  Grid,
  Download,
  Clock,
  CalendarDays,
  User,
  Shield,
  GraduationCap,
  Bot
} from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';

const Sidebar = () => {
  const { role, selectedRole, user, logout } = useAuth();
  const navigate = useNavigate();
  
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Unidades Académicas', path: '/admin/unidades', icon: <Building className="w-5 h-5" /> },
    { name: 'Períodos Académicos', path: '/admin/periodos-academicos', icon: <CalendarDays className="w-5 h-5" /> },
    { name: 'Usuarios', path: '/admin/usuarios', icon: <User className="w-5 h-5" /> },
    { name: 'Docentes', path: '/admin/docentes', icon: <Users className="w-5 h-5" /> },
    { name: 'Aulas', path: '/admin/aulas', icon: <Grid className="w-5 h-5" /> },
    { name: 'Disponibilidad', path: '/admin/disponibilidad', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Horarios Manual', path: '/admin/horarios/manual', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Horarios Automático', path: '/admin/horarios/automatico', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Restricciones', path: '/admin/restricciones', icon: <Settings className="w-5 h-5" /> },
    { name: 'Reportes', path: '/admin/reportes', icon: <FileText className="w-5 h-5" /> },
    { name: 'Asistente IA', path: '/admin/chatbot', icon: <Bot className="w-5 h-5" /> }
  ];
  
  const docenteLinks = [
    { name: 'Dashboard', path: '/docente/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Mi Disponibilidad', path: '/docente/disponibilidad', icon: <Clock className="w-5 h-5" /> },
    { name: 'Mi Horario', path: '/docente/horario', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Exportar Horario', path: '/docente/exportar', icon: <Download className="w-5 h-5" /> },
    { name: 'Asistente IA', path: '/docente/chatbot', icon: <Bot className="w-5 h-5" /> }
  ];
  
  const links = role === 'Administrador' ? adminLinks : docenteLinks;
  
  // Función para obtener el icono del rol
  const getRoleIcon = () => {
    if (role === 'Administrador') {
      return <Shield className="w-4 h-4" />;
    } else if (role === 'Docente') {
      return <GraduationCap className="w-4 h-4" />;
    }
    return <User className="w-4 h-4" />;
  };

  // Función para obtener el color del rol
  const getRoleColor = () => {
    if (role === 'Administrador') {
      return 'bg-yellow-500 text-yellow-900';
    } else if (role === 'Docente') {
      return 'bg-red-500 text-white';
    }
    return 'bg-gray-500 text-white';
  };
  
  return (
    <aside className="h-screen w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        <div className="academic-gradient text-white p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Sistema de Horarios</h2>
            <DarkModeToggle />
          </div>
          <p className="text-sm opacity-80">
            {role === 'Administrador' ? 'Panel Administrativo' : 'Panel Docente'}
          </p>
        </div>

        {/* Información del usuario y rol */}
        <div className="mb-6 p-3 bg-sidebar-accent rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-sidebar-foreground">Usuario:</span>
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor()}`}>
              {getRoleIcon()}
              <span className="ml-1">{role}</span>
            </div>
          </div>
          {user && (
            <div className="text-xs text-sidebar-foreground opacity-80">
              <div>{user.username}</div>
              {user.first_name && user.last_name && (
                <div>{user.first_name} {user.last_name}</div>
              )}
            </div>
          )}
          {selectedRole && selectedRole !== role && (
            <div className="mt-2 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
              <strong>Nota:</strong> Tu rol real es {role}, no {selectedRole}
            </div>
          )}
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => 
                cn(
                  "flex items-center px-4 py-3 rounded-lg transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <span className="mr-3">{link.icon}</span>
              <span>{link.name}</span>
            </NavLink>
          ))}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center px-4 py-3 text-sidebar-foreground rounded-lg hover:bg-sidebar-accent transition-all mt-10"
              >
                <LogIn className="w-5 h-5 mr-3" />
                <span>Cerrar Sesión</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Deseas cerrar sesión?</AlertDialogTitle>
                <AlertDialogDescription>
                  Si cierras sesión tendrás que ingresar tus credenciales nuevamente para acceder al sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Sí, cerrar sesión
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
