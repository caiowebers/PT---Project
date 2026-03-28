import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Dumbbell, Activity, Ruler } from "lucide-react";
import { motion } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Student, Workout, Exercise, PhysicalEvaluation, BodyMeasurements } from "../types";
import WorkoutEditor from "./WorkoutEditor";
import { storageService } from "../services/storageService";

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [student, setStudent] = useState<Partial<Student>>({
    id: uuidv4(),
    shareSlug: uuidv4(),
    name: "",
    age: 0,
    goal: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
    evaluations: [],
    measurements: [],
    workouts: []
  });

  const [currentEval, setCurrentEval] = useState<Partial<PhysicalEvaluation>>({});
  const [currentMeas, setCurrentMeas] = useState<Partial<BodyMeasurements>>({});

  useEffect(() => {
    const fetchStudent = async () => {
      if (isEdit && id) {
        const existing = await storageService.getStudentById(id);
        if (existing) {
          setStudent(existing);
          if (existing.evaluations.length > 0) setCurrentEval(existing.evaluations[existing.evaluations.length - 1]);
          if (existing.measurements.length > 0) setCurrentMeas(existing.measurements[existing.measurements.length - 1]);
        }
      }
    };
    fetchStudent();
  }, [id, isEdit]);

  const [activeTab, setActiveTab] = useState<"profile" | "physical" | "workouts">("profile");

  const handleSave = async () => {
    if (!student.name) {
      toast.error("Por favor, insira o nome do aluno.");
      return;
    }

    try {
      const studentToSave = {
        ...student,
        evaluations: [...(student.evaluations || []), { ...currentEval, date: new Date().toISOString() } as PhysicalEvaluation],
        measurements: [...(student.measurements || []), { ...currentMeas, date: new Date().toISOString() } as BodyMeasurements]
      } as Student;

      await storageService.saveStudent(studentToSave);
      toast.success("Dados do aluno guardados com sucesso!");
      navigate("/admin");
    } catch (error) {
      console.error("Erro ao guardar aluno:", error);
      toast.error("Erro ao guardar dados. Certifique-se que está autenticado com Google.");
    }
  };

  const addWorkout = () => {
    const newWorkout: Workout = {
      id: uuidv4(),
      name: `Treino ${String.fromCharCode(65 + (student.workouts?.length || 0))}`,
      exercises: []
    };
    setStudent(prev => ({ ...prev, workouts: [...(prev.workouts || []), newWorkout] }));
  };

  const removeWorkout = (workoutId: string) => {
    if (window.confirm("Tem a certeza que deseja remover este treino?")) {
      setStudent(prev => ({
        ...prev,
        workouts: prev.workouts?.filter(w => w.id !== workoutId)
      }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 transition-all hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 font-bold transition-all rounded-lg bg-neon-green text-gym-dark hover:bg-neon-green/90"
        >
          <Save className="w-5 h-5" />
          Guardar Aluno
        </button>
      </div>

      <div className="flex gap-4 p-1 rounded-xl bg-gym-card border border-gym-border">
        {(["profile", "physical", "workouts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === tab 
                ? "bg-neon-green text-gym-dark" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab === "profile" && "Perfil"}
            {tab === "physical" && "Avaliação"}
            {tab === "workouts" && "Treinos"}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        {activeTab === "profile" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Nome Completo</label>
              <input 
                type="text" 
                value={student.name}
                onChange={e => setStudent(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 bg-black border rounded-lg border-gym-border focus:border-neon-green outline-hidden"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Idade</label>
              <input 
                type="number" 
                value={student.age}
                onChange={e => setStudent(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                className="w-full p-3 bg-black border rounded-lg border-gym-border focus:border-neon-green outline-hidden"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Objetivo</label>
              <input 
                type="text" 
                value={student.goal}
                onChange={e => setStudent(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Ex: Hipertrofia e emagrecimento"
                className="w-full p-3 bg-black border rounded-lg border-gym-border focus:border-neon-green outline-hidden"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Data de Início</label>
              <input 
                type="date" 
                value={student.startDate}
                onChange={e => setStudent(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-3 bg-black border rounded-lg border-gym-border focus:border-neon-green outline-hidden"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400">Notas e Recomendações</label>
              <textarea 
                rows={4}
                value={student.notes}
                onChange={e => setStudent(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex: Hidratação diária: 3,255L..."
                className="w-full p-3 bg-black border rounded-lg border-gym-border focus:border-neon-green outline-hidden"
              />
            </div>
          </div>
        )}

        {activeTab === "physical" && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-neon-green">
              <Activity className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider">Avaliação Física</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Peso (kg)", key: "weight" },
                { label: "Altura (m)", key: "height" },
                { label: "IMC", key: "bmi" },
                { label: "TBM (kcal)", key: "bmr" },
                { label: "Fcmáx (bpm)", key: "maxHr" }
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-gray-500">{field.label}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={(currentEval as any)[field.key] || ""}
                    onChange={e => setCurrentEval(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) }))}
                    className="w-full p-2 bg-black border border-gym-border rounded focus:border-neon-green outline-hidden"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-neon-orange">
              <Ruler className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider">Medidas Corporais (cm)</h3>
            </div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "Peito", key: "chest" },
                { label: "Bíceps D", key: "bicepsR" },
                { label: "Bíceps E", key: "bicepsL" },
                { label: "Cintura", key: "waist" },
                { label: "Abdómen", key: "abdomen" },
                { label: "Anca", key: "hips" },
                { label: "Coxa D", key: "thighR" },
                { label: "Coxa E", key: "thighL" },
                { label: "Panturrilha D", key: "calfR" },
                { label: "Panturrilha E", key: "calfL" }
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-gray-500">{field.label}</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={(currentMeas as any)[field.key] || ""}
                    onChange={e => setCurrentMeas(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) }))}
                    className="w-full p-2 bg-black border border-gym-border rounded focus:border-neon-orange outline-hidden"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "workouts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Planos de Treino</h3>
              <button 
                onClick={addWorkout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-white/5 hover:bg-white/10 border border-gym-border"
              >
                <Plus className="w-4 h-4" />
                Adicionar Treino
              </button>
            </div>

            {student.workouts?.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-gym-border rounded-xl">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500">Nenhum treino criado ainda.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {student.workouts?.map((workout, idx) => {
                  const colors = [
                    "border-neon-green/30 shadow-neon-green/5",
                    "border-blue-400/30 shadow-blue-400/5",
                    "border-neon-orange/30 shadow-neon-orange/5",
                    "border-purple-400/30 shadow-purple-400/5"
                  ];
                  const accentColor = colors[idx % colors.length];
                  
                  return (
                    <div key={workout.id} className={`p-6 border rounded-2xl bg-black/40 shadow-xl transition-all ${accentColor}`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${accentColor.split(' ')[0].replace('border-', 'bg-').replace('/30', '')} text-black`}>
                            {workout.name.split(' ')[1] || workout.name[0]}
                          </div>
                          <h4 className="font-black text-xl tracking-tight">{workout.name}</h4>
                        </div>
                        <button 
                          onClick={() => removeWorkout(workout.id)}
                          className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <WorkoutEditor 
                        workout={workout} 
                        onUpdate={(updatedWorkout) => {
                          const newWorkouts = student.workouts?.map(w => 
                            w.id === updatedWorkout.id ? updatedWorkout : w
                          );
                          setStudent(prev => ({ ...prev, workouts: newWorkouts }));
                        }} 
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
