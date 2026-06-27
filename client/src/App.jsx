import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PatientProvider } from './context/PatientContext.jsx';
import QREntry from './pages/QREntry.jsx';
import PatientChat from './pages/PatientChat.jsx';
import NurseLogin from './pages/NurseLogin.jsx';
import NurseHome from './pages/NurseHome.jsx';
import NurseChatView from './components/nurse/NurseChatView.jsx';

export default function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <BrowserRouter>
          <Routes>
            {/* Patient Portal */}
            <Route path="/qr" element={<QREntry />} />
            <Route path="/patient/:sessionId" element={<PatientChat />} />

            {/* Nurse Portal */}
            <Route path="/nurse/login" element={<NurseLogin />} />
            <Route path="/nurse/dashboard" element={<NurseHome />} />
            <Route path="/nurse/chat/:sessionId" element={<NurseChatView />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/qr" replace />} />
            <Route path="*" element={<Navigate to="/qr" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}
