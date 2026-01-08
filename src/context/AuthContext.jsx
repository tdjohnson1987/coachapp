import React, { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext({ user: null });

export const AuthProvider = ({ user, children }) => {
  const value = useMemo(() => ({ user }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
