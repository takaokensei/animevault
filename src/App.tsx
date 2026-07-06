import { AppRouter } from './router';
import { SyncFloatingButton } from './components/SyncFloatingButton';
import { ToastContainer } from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 30,       // 30 minutos de cache antes de revalidar
      gcTime: 1000 * 60 * 60 * 24,     // 24h em memória antes de GC
      refetchOnMount: 'always',         // SWR: exibe dado em cache, re-busca em segundo plano
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <AppRouter />
        <SyncFloatingButton />

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastStyle={{
            background: 'rgba(22,27,34,0.95)',
            border: '1px solid rgba(124,58,237,0.3)',
            backdropFilter: 'blur(20px)',
            color: '#E6EDF3',
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;