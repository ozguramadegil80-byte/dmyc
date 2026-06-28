import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import doc from '@/data/legal/kullanim-kosullari.json';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları — DMyC',
  description: 'DMyC uygulaması kullanım koşulları.',
};

export default function KullanimKosullariPage() {
  return <LegalPage doc={doc} />;
}
