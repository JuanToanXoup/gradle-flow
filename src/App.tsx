import { TaskGraphCanvas } from './components/TaskGraphCanvas';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Gradle Flow</h1>
        <span className="subtitle">Visual Task Graph Editor</span>
      </header>
      <main className="app-main">
        <TaskGraphCanvas />
      </main>
    </div>
  );
}

export default App;
