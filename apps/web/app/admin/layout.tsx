export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#080f10', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
