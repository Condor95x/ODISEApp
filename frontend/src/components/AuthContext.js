import React, { createContext, useState, useEffect, useContext } from 'react';
// Crear el contexto
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la aplicación
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'username': email,
          'password': password,
        }),
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      
      // Guardar el token
      localStorage.setItem('token', data.access_token);
      
      // Obtener datos del usuario
      const userResponse = await fetch('http://localhost:8000/auth/users/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        },
      });
      
      if (!userResponse.ok) {
        throw new Error('Error al obtener datos del usuario');
      }
      
      const userData = await userResponse.json();
      
      // Guardar datos del usuario
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (requiredRole) => {
    if (!user) return false;
    
    // Si es administrador, tiene acceso a todo
    if (user.rol === 'administrador') return true;
    
    // De lo contrario, verificar el rol específico
    return user.rol === requiredRole;
  };

  // Verificar si el usuario tiene acceso a un módulo específico
  const hasModuleAccess = (module) => {
    if (!user) return false;
    
    // Si es administrador, tiene acceso a todo
    if (user.rol === 'administrador') return true;

    switch (module) {
      case 'plots':
        return ['tecnico finca'].includes(user.rol);
      case 'inventory':
        return ['tecnico finca'].includes(user.rol);        
      case 'finca':
        return ['tecnico finca', 'operario'].includes(user.rol);
      case 'bodega':
        return ['tecnico bodega', 'obrero'].includes(user.rol);
      default:
        return false;

    }
  };

  // Verificar si el usuario puede crear operaciones en un módulo
  const canCreateOperations = (module) => {
    if (!user) return false;
    
    // Si es administrador o técnico, puede crear operaciones
    if (user.rol === 'administrador') return true;
    
    switch (module) {
      case 'finca':
        return user.rol === 'tecnico finca';
      case 'bodega':
        return user.rol === 'tecnico bodega';
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      hasRole, 
      hasModuleAccess, 
      canCreateOperations 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para facilitar el uso del contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};