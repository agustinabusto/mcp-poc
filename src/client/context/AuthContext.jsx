// 1. CONTEXTO DE AUTENTICACIÓN
// src/client/context/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth-service.js';

const AuthContext = createContext();

// Estados del contexto
const initialState = {
    isAuthenticated: false,
    user: null,
    tokens: null,
    permissions: [],
    loading: false,
    error: null,
    sessionExpiring: false
};

// Reducer para manejo de estados
const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, loading: true, error: null };

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                loading: false,
                isAuthenticated: true,
                user: action.payload.user,
                tokens: action.payload.tokens,
                permissions: action.payload.permissions,
                error: null
            };

        case 'LOGIN_ERROR':
            return {
                ...state,
                loading: false,
                error: action.payload,
                isAuthenticated: false,
                user: null,
                tokens: null,
                permissions: []
            };

        case 'LOGOUT':
            return { ...initialState };

        case 'REFRESH_SUCCESS':
            return {
                ...state,
                tokens: action.payload.tokens,
                user: action.payload.user,
                permissions: action.payload.permissions,
                sessionExpiring: false
            };

        case 'SESSION_EXPIRING':
            return { ...state, sessionExpiring: true };

        case 'UPDATE_USER':
            return { ...state, user: { ...state.user, ...action.payload } };

        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Inicializar desde localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedTokens = localStorage.getItem('@bookkeeper/auth_tokens');
            const storedUser = localStorage.getItem('@bookkeeper/user_data');

            if (storedTokens && storedUser) {
                try {
                    const tokens = JSON.parse(storedTokens);
                    const user = JSON.parse(storedUser);

                    // Verificar si el token no ha expirado
                    const tokenData = JSON.parse(atob(tokens.accessToken.split('.')[1]));
                    const isExpired = tokenData.exp * 1000 < Date.now();

                    if (!isExpired) {
                        const permissions = await authService.getPermissions();
                        dispatch({
                            type: 'LOGIN_SUCCESS',
                            payload: { user, tokens, permissions }
                        });
                    } else {
                        // Intentar refresh
                        try {
                            const refreshResult = await authService.refreshToken(tokens.refreshToken);
                            dispatch({
                                type: 'REFRESH_SUCCESS',
                                payload: refreshResult
                            });
                        } catch (error) {
                            // Refresh falló, limpiar storage
                            localStorage.removeItem('@bookkeeper/auth_tokens');
                            localStorage.removeItem('@bookkeeper/user_data');
                        }
                    }
                } catch (error) {
                    console.error('Error inicializando auth:', error);
                    localStorage.removeItem('@bookkeeper/auth_tokens');
                    localStorage.removeItem('@bookkeeper/user_data');
                }
            }
        };

        initAuth();
    }, []);

    // Auto-refresh token
    useEffect(() => {
        if (!state.tokens) return;

        const tokenData = JSON.parse(atob(state.tokens.accessToken.split('.')[1]));
        const expiryTime = tokenData.exp * 1000;
        const now = Date.now();
        const timeToExpiry = expiryTime - now;

        // Avisar 5 minutos antes de expirar
        const warningTime = timeToExpiry - 5 * 60 * 1000;

        if (warningTime > 0) {
            const warningTimer = setTimeout(() => {
                dispatch({ type: 'SESSION_EXPIRING' });
            }, warningTime);

            return () => clearTimeout(warningTimer);
        }
    }, [state.tokens]);

    const login = async (credentials, deviceInfo) => {
        dispatch({ type: 'LOGIN_START' });

        try {
            const result = await authService.login(credentials, deviceInfo);

            // Guardar en localStorage
            localStorage.setItem('@bookkeeper/auth_tokens', JSON.stringify(result.tokens));
            localStorage.setItem('@bookkeeper/user_data', JSON.stringify(result.user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: result
            });

            return result;
        } catch (error) {
            dispatch({
                type: 'LOGIN_ERROR',
                payload: error.message
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (state.tokens) {
                await authService.logout(state.tokens.refreshToken);
            }
        } catch (error) {
            console.error('Error durante logout:', error);
        } finally {
            localStorage.removeItem('@bookkeeper/auth_tokens');
            localStorage.removeItem('@bookkeeper/user_data');
            dispatch({ type: 'LOGOUT' });
        }
    };

    const refreshToken = async () => {
        try {
            const result = await authService.refreshToken(state.tokens.refreshToken);

            localStorage.setItem('@bookkeeper/auth_tokens', JSON.stringify(result.tokens));
            localStorage.setItem('@bookkeeper/user_data', JSON.stringify(result.user));

            dispatch({
                type: 'REFRESH_SUCCESS',
                payload: result
            });

            return result;
        } catch (error) {
            // Si refresh falla, cerrar sesión
            await logout();
            throw error;
        }
    };

    const updateUser = (userData) => {
        const updatedUser = { ...state.user, ...userData };
        localStorage.setItem('@bookkeeper/user_data', JSON.stringify(updatedUser));
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    const value = {
        ...state,
        login,
        logout,
        refreshToken,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};