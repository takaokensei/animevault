import { AppRouter } from './router';
import { SyncFloatingButton } from './components/SyncFloatingButton';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
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
  );
}

export default App;