import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import doc from '@/data/legal/kvkk.json';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — DMyC',
  description: 'DMyC kişisel verilerin korunması kanunu aydınlatma metni.',
};

export default function KvkkPage() {
  return <LegalPage doc={doc} />;
}
