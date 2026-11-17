import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FacilityProvider } from './context/FacilityContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FacilityProvider>
          <AppRoutes />
        </FacilityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
