// Archivo principal para las rutas
import express from 'express';
import pacienteRoutes from './pacienteRoutes.js';
import medicoRoutes from './medicoRoutes.js';
import turnoRoutes from './turnoRoutes.js';
import authRoutes from './authRoutes.js';

import Paciente from '../models/Paciente.js';
import Medico from '../models/Medico.js';
import Turno from '../models/Turno.js';
import DatabaseService from '../models/DatabaseService.js';
import { requireAuthView } from '../middleware/index.js';

const router = express.Router();

// 🟢 Dashboard principal con datos reales desde DatabaseService
router.get('/', requireAuthView, async (req, res) => {
  try {
    const turnos = await Turno.getTurnosCompletos();
    const pacientes = await Paciente.getAll();
    const medicos = await Medico.getAll();

    // Si querés limitar la cantidad mostrada
    const ultimosTurnos = turnos.slice(-6).reverse();
    const ultimosPacientes = pacientes.slice(-6).reverse();

    const turnosFormateados = ultimosTurnos.map(turno => {
        if (!turno.Fecha) {
            return { ...turno, fechaFormateada: 'Fecha no disp.' };
        }
        // Asegurarse que la fecha se interpreta correctamente como UTC
        const fecha = new Date(turno.Fecha);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = fecha.getUTCFullYear();
        return {
            ...turno,
            fechaFormateada: `${dia}/${mes}/${anio}`
        };
    });

    res.render('index', {
      title: 'Dashboard - Clínica Salud Integral',
      turnos: turnosFormateados,
      pacientes: ultimosPacientes,
      medicos,
      metrics: {
        turnos: turnos.length,
        pacientes: pacientes.length,
        medicos: medicos.length
      },
      user: req.session?.user || null
    });
  } catch (error) {
    console.error('Error cargando datos del dashboard:', error);
    res.render('index', {
      title: 'Dashboard - Clínica Salud Integral',
      turnos: [],
      pacientes: [],
      medicos: [],
      metrics: { turnos: 0, pacientes: 0, medicos: 0 },
      error: 'Error al obtener datos de la base de datos',
      user: req.session?.user || null
    });
  }
});

// 🩺 Rutas para vistas individuales
router.get('/pacientes', requireAuthView, (req, res) => {
  res.render('pacientes', { title: 'Gestión de Pacientes', user: req.session?.user || null });
});

router.get('/medicos', requireAuthView, (req, res) => {
  res.render('medicos', { title: 'Gestión de Médicos', user: req.session?.user || null });
});

router.get('/turnos', requireAuthView, (req, res) => {
  res.render('turnos', { title: 'Gestión de Turnos', user: req.session?.user || null });
});

router.get('/usuarios', requireAuthView, (req, res) => {
  const user = req.session?.user || null;
  if (!user || user.role !== 'Administrativo') {
    return res.redirect('/');
  }
  res.render('usuarios', { title: 'Gestión de Usuarios', user });
});
// Página de Login
router.get('/login', (req, res) => {
  const user = req.session?.user || null;
  if (user) {
    // Redirección por rol si ya está autenticado
    if (user.role === 'Administrativo') return res.redirect('/');
    if (user.role === 'Medico') return res.redirect('/pacientes');
    if (user.role === 'Paciente') return res.redirect('/turnos');
  }
  res.render('login', { title: 'Iniciar Sesión', user: null });
});

// Registro público de Paciente
router.get('/registro/paciente', (req, res) => {
  const googleEmail = req.query.googleEmail || '';
  const googleFirstName = req.query.googleFirstName || '';
  const googleLastName = req.query.googleLastName || '';
  res.render('registroPaciente', { title: 'Registro de Paciente', user: null, googleEmail, googleFirstName, googleLastName });
})
// 🧠 Estado de la API
router.get('/api/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    database: 'MongoDB Atlas',
    endpoints: {
      pacientes: '/api/pacientes',
      medicos: '/api/medicos',
      turnos: '/api/turnos',
      status: '/api/status'
    }
  });
});

// Rutas API
router.use('/api/pacientes', pacienteRoutes);
router.use('/api/medicos', medicoRoutes);
router.use('/api/turnos', turnoRoutes);
router.use('/api/auth', authRoutes);

export default router;