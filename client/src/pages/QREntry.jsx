import { useSearchParams } from 'react-router-dom';
import QRLandingPage from '../components/patient/QRLandingPage';

const DEFAULT_HOSPITAL_ID = import.meta.env.VITE_HOSPITAL_ID || '00000000-0000-0000-0000-000000000001';

/**
 * Entry point from QR code scan.
 * URL: /qr?hospital={hospitalId}
 */
export default function QREntry() {
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get('hospital') || DEFAULT_HOSPITAL_ID;

  return <QRLandingPage hospitalId={hospitalId} />;
}
