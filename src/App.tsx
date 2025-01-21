import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import ExerciseList from './pages/ExerciseList';
import CreateExercise from './pages/CreateExercise';
import ExerciseDetail from './pages/ExerciseDetail';
import EditExercise from './pages/EditExercise';
import ExerciseEvaluation from './pages/ExerciseEvaluation';
import Welcome from './pages/Welcome';
import Solution from './pages/Solution';
import { EisenhowerExercise } from './pages/EisenhowerExercise';
import MemberManagement from './pages/MemberManagement';
import GoalkeeperExercise from './pages/GoalkeeperExercise';
import StudentExercises from './pages/StudentExercises';
import EvaluationSettings from './pages/EvaluationSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterTrainer from './pages/RegisterTrainer';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-trainer" element={<RegisterTrainer />} />
            <Route path="*" element={
              <PrivateRoute>
                <div>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/exercises" element={<ExerciseList />} />
                    <Route path="/exercises/create" element={<CreateExercise />} />
                    <Route path="/exercises/:id" element={<ExerciseDetail />} />
                    <Route path="/exercises/:id/edit" element={<EditExercise />} />
                    <Route path="/exercises/:userId" element={<StudentExercises />} />
                    <Route path="/member-management" element={
                      <PrivateRoute requiredRole="formateur">
                        <MemberManagement />
                      </PrivateRoute>
                    } />
                    <Route path="/evaluate/:userId/:exerciseId" element={<ExerciseEvaluation />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/solution" element={<Solution />} />
                    <Route path="/eisenhower" element={<EisenhowerExercise />} />
                    <Route path="/goalkeeper" element={<GoalkeeperExercise />} />
                    <Route path="/student-exercises/:userId" element={
                      <PrivateRoute requiredRole="formateur">
                        <StudentExercises />
                      </PrivateRoute>
                    } />
                    <Route path="/evaluation-settings" element={
                      <PrivateRoute requiredRole={["admin", "formateur"] as const}>
                        <EvaluationSettings />
                      </PrivateRoute>
                    } />
                  </Routes>
                </div>
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;