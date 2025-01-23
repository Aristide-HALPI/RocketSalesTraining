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
import GoalkeeperExercise from './features/goalkeeper/pages/GoalkeeperExercise';
import StudentExercises from './pages/StudentExercises';
import EvaluationSettings from './pages/EvaluationSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterTrainer from './pages/RegisterTrainer';
import Sections from './pages/Sections';
import RdvDecideur from './pages/RdvDecideur';
import IIEP from './pages/IIEP';
import Presentation from './pages/Presentation';
import Eombus from './pages/Eombus';
import Cles from './pages/Cles';
import CDAB from './pages/CDAB';
import OutilCDAB from './pages/OutilCDAB';
import Objections from './pages/Objections';
import PointsBonus from './pages/PointsBonus';
import PointsRoleFinal from './pages/PointsRoleFinal';
import Certification from './pages/Certification';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
      <AuthProvider>
        <div className="App">
          <ToastContainer position="top-right" autoClose={3000} />
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
                      <PrivateRoute requiredRole="trainer">
                        <MemberManagement />
                      </PrivateRoute>
                    } />
                    <Route path="/evaluate/:userId/:exerciseId" element={<ExerciseEvaluation />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/solution" element={<Solution />} />
                    <Route path="/eisenhower" element={<EisenhowerExercise />} />
                    <Route path="/goalkeeper/:studentId?" element={
                      <PrivateRoute>
                        <GoalkeeperExercise />
                      </PrivateRoute>
                    } />
                    <Route path="/sections" element={
                      <PrivateRoute>
                        <Sections />
                      </PrivateRoute>
                    } />
                    <Route path="/rdv-decideur" element={<RdvDecideur />} />
                    <Route path="/iiep" element={<IIEP />} />
                    <Route path="/presentation" element={<Presentation />} />
                    <Route path="/eombus" element={<Eombus />} />
                    <Route path="/cles" element={<Cles />} />
                    <Route path="/cdab" element={<CDAB />} />
                    <Route path="/outil-cdab" element={<OutilCDAB />} />
                    <Route path="/objections" element={<Objections />} />
                    <Route path="/points-bonus" element={<PointsBonus />} />
                    <Route path="/points-role-final" element={<PointsRoleFinal />} />
                    <Route path="/certification" element={<Certification />} />
                    <Route path="/student-exercises/:userId" element={
                      <PrivateRoute requiredRole="trainer">
                        <StudentExercises />
                      </PrivateRoute>
                    } />
                    <Route path="/evaluation-settings" element={
                      <PrivateRoute requiredRole={["admin", "trainer"] as const}>
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