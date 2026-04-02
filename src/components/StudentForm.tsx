import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Dumbbell, Activity, Ruler, Camera, Brain, Sparkles, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Student, Workout, Exercise, PhysicalEvaluation, BodyMeasurements, ClassSession, ExerciseLibraryItem } from "../types";
import WorkoutEditor from "./WorkoutEditor";
import { storageService } from "../services/storageService";
import { wgerService } from "../services/wgerService";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);

  const [isEvalModified, setIsEvalModified] = useState(false);
  const [isMeasModified, setIsMeasModified] = useState(false);

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

    const fetchSettings = async () => {
      const user = storageService.getCurrentUserId();
      if (user) {
        const settings = await storageService.getAdminSettings(user);
        if (settings?.exerciseLibrary) {
          setExerciseLibrary(settings.exerciseLibrary);
        }
      }
    };
    fetchSettings();
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit && id) {
      const unsubscribe = storageService.subscribeToSessions((allSessions) => {
        setSessions(allSessions.filter(s => s.studentId === id).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()));
      });
      return () => unsubscribe();
    }
  }, [id, isEdit]);

  const [activeTab, setActiveTab] = useState<"profile" | "physical" | "workouts" | "timeline">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("Existem alterações não guardadas. Tem a certeza que deseja sair?")) {
        navigate("/admin");
      }
    } else {
      navigate("/admin");
    }
  };

  const handleGenerateInsights = async () => {
    if (!student.name) {
      toast.error("Por favor, insira o nome do aluno primeiro.");
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const insights = await wgerService.generateHealthInsights(student);
      setStudent(prev => ({ ...prev, healthInsights: insights }));
      setHasUnsavedChanges(true);
      toast.success("Insights de saúde gerados com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar insights.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 storage
        toast.error("A imagem é muito grande. Por favor, escolha uma imagem menor que 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudent(prev => ({ ...prev, photoUrl: reader.result as string }));
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!student.name) {
      toast.error("Por favor, insira o nome do aluno.");
      return;
    }

    setIsSaving(true);
    try {
      const studentToSave = { ...student } as Student;

      // Only add evaluation if modified
      if (isEvalModified && currentEval.weight) {
        studentToSave.evaluations = [
          ...(student.evaluations || []), 
          { ...currentEval, date: new Date().toISOString() } as PhysicalEvaluation
        ];
      }

      // Only add measurement if modified
      if (isMeasModified && (currentMeas.chest || currentMeas.waist || currentMeas.abdomen || currentMeas.hips)) {
        studentToSave.measurements = [
          ...(student.measurements || []), 
          { ...currentMeas, date: new Date().toISOString() } as BodyMeasurements
        ];
      }

      await storageService.saveStudent(studentToSave);
      toast.success("Dados do aluno guardados com sucesso!");
      setHasUnsavedChanges(false);
      setIsEvalModified(false);
      setIsMeasModified(false);
      navigate("/admin");
    } catch (error: any) {
      console.error("Erro ao guardar aluno:", error);
      if (error.message?.includes("insufficient permissions")) {
        toast.error("Erro de permissão. Certifique-se que é o proprietário destes dados.");
      } else {
        toast.error("Erro ao guardar dados. Verifique a sua ligação.");
      }
    } finally {
      setIsSaving(false);
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
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 transition-all hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 font-bold transition-all rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-50 shadow-md shadow-black/20"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Guardando..." : "Guardar Aluno"}
        </button>
      </div>

      <div className="flex gap-4 p-1 rounded-xl bg-white border border-gray-200 overflow-x-auto no-scrollbar shadow-sm">
        {(["profile", "physical", "workouts", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === tab 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab === "profile" && "Perfil"}
            {tab === "physical" && "Avaliação"}
            {tab === "workouts" && "Treinos"}
            {tab === "timeline" && "Histórico & Agenda"}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6"
      >
        {activeTab === "profile" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2 flex flex-col items-center mb-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-100 flex items-center justify-center shadow-lg">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full cursor-pointer shadow-md hover:bg-gray-900 transition-all">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">Clique na câmara para alterar a foto</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Nome Completo</label>
              <input 
                type="text" 
                value={student.name}
                onChange={e => {
                  setStudent(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Email (Para convites de agenda)</label>
              <input 
                type="email" 
                value={student.email || ""}
                onChange={e => {
                  setStudent(prev => ({ ...prev, email: (e.target as HTMLInputElement).value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="exemplo@email.com"
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Idade</label>
              <input 
                type="number" 
                value={student.age}
                onChange={e => {
                  setStudent(prev => ({ ...prev, age: parseInt((e.target as HTMLInputElement).value) }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Objetivo</label>
              <input 
                type="text" 
                value={student.goal}
                onChange={e => {
                  setStudent(prev => ({ ...prev, goal: (e.target as HTMLInputElement).value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="Ex: Hipertrofia e emagrecimento"
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Data de Início</label>
              <input 
                type="date" 
                value={student.startDate}
                onChange={e => {
                  setStudent(prev => ({ ...prev, startDate: (e.target as HTMLInputElement).value }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-600">Feedback do Personal (Aparece no perfil do aluno)</label>
              <textarea 
                rows={3}
                value={student.personalFeedback || ""}
                onChange={e => {
                  setStudent(prev => ({ ...prev, personalFeedback: (e.target as HTMLTextAreaElement).value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="Ex: Ótima evolução este mês! Foca na execução do agachamento..."
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <Brain className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider">Insights de Saúde (IA)</h3>
                </div>
                <button 
                  onClick={handleGenerateInsights}
                  disabled={isGeneratingInsights}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50"
                >
                  {isGeneratingInsights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGeneratingInsights ? "Gerando..." : "Gerar com IA"}
                </button>
              </div>
              
              {student.healthInsights ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {student.healthInsights}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-xs text-gray-500">Clique em "Gerar com IA" para obter um resumo de saúde baseado nos dados do aluno.</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-600">Notas e Recomendações</label>
              <textarea 
                rows={4}
                value={student.notes}
                onChange={e => {
                  setStudent(prev => ({ ...prev, notes: (e.target as HTMLTextAreaElement).value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="Ex: Hidratação diária: 3,255L..."
                className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
              />
            </div>
          </div>
        )}

        {activeTab === "physical" && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider">Avaliação Física</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Peso (kg)", key: "weight" },
                { label: "Altura (m)", key: "height" },
                { label: "IMC", key: "bmi" },
                { label: "TBM (kcal)", key: "bmr" },
                { label: "Fcmáx (bpm)", key: "maxHr" },
                { label: "% Gordura", key: "bodyFat" },
                { label: "Massa Muscular (kg)", key: "muscleMass" },
                { label: "Massa Gorda (kg)", key: "fatMass" }
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-gray-600">{field.label}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={(currentEval as any)[field.key] || ""}
                    onChange={e => {
                      setCurrentEval(prev => ({ ...prev, [field.key]: parseFloat((e.target as HTMLInputElement).value) }));
                      setHasUnsavedChanges(true);
                      setIsEvalModified(true);
                    }}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-orange-500">
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
                  <label className="text-xs text-gray-600">{field.label}</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={(currentMeas as any)[field.key] || ""}
                    onChange={e => {
                      setCurrentMeas(prev => ({ ...prev, [field.key]: parseFloat((e.target as HTMLInputElement).value) }));
                      setHasUnsavedChanges(true);
                      setIsMeasModified(true);
                    }}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-gray-900 shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "workouts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Planos de Treino</h3>
              <button 
                onClick={() => {
                  addWorkout();
                  setHasUnsavedChanges(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar Treino
              </button>
            </div>

            {student.workouts?.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Nenhum treino criado ainda.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {student.workouts?.map((workout, idx) => {
                  const colors = [
                    "border-red-200 shadow-red-100",
                    "border-blue-200 shadow-blue-100",
                    "border-orange-200 shadow-orange-100",
                    "border-purple-200 shadow-purple-100"
                  ];
                  const accentColor = colors[idx % colors.length];
                  
                  return (
                    <div key={workout.id} className={`p-6 border rounded-2xl bg-white shadow-sm transition-all ${accentColor}`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${accentColor.split(' ')[0].replace('border-', 'bg-').replace('-200', '-50')} ${accentColor.split(' ')[0].replace('border-', 'text-').replace('-200', '-600')}`}>
                            {workout.name.split(' ')[1] || workout.name[0]}
                          </div>
                          <h4 className="font-black text-xl tracking-tight text-gray-900">{workout.name}</h4>
                        </div>
                        <button 
                          onClick={() => {
                            removeWorkout(workout.id);
                            setHasUnsavedChanges(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <WorkoutEditor 
                        workout={workout} 
                        exerciseLibrary={exerciseLibrary}
                        onUpdate={(updatedWorkout) => {
                          const newWorkouts = student.workouts?.map(w => 
                            w.id === updatedWorkout.id ? updatedWorkout : w
                          );
                          setStudent(prev => ({ ...prev, workouts: newWorkouts }));
                          setHasUnsavedChanges(true);
                        }} 
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight text-gray-900">Histórico de Aulas</h3>
              <button 
                onClick={() => navigate("/admin", { state: { openCalendarForStudent: student.id } })}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-black text-white hover:bg-gray-900 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agendar Aula
              </button>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-12 text-center border rounded-2xl bg-gray-50 border-gray-200">
                <p className="text-gray-600">Nenhuma aula agendada ou concluída.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => {
                  const isPast = new Date(session.end) < new Date();
                  const isCompleted = session.status === 'completed';
                  const isCancelled = session.status === 'cancelled';
                  
                  return (
                    <div key={session.id} className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isCompleted ? 'bg-green-50 border-green-200' : 
                      isCancelled ? 'bg-red-50 border-red-200' : 
                      isPast ? 'bg-gray-50 border-gray-200 opacity-70' : 
                      'bg-white border-gray-200 shadow-sm'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isCompleted ? 'bg-green-100 text-green-700' : 
                            isCancelled ? 'bg-red-100 text-red-700' : 
                            isPast ? 'bg-gray-200 text-gray-600' : 
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {isCompleted ? 'Concluída' : isCancelled ? 'Cancelada' : isPast ? 'Passada' : 'Agendada'}
                          </span>
                          <span className="text-xs text-gray-600">
                            {format(parseISO(session.start), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg text-gray-900">{session.workoutTitle}</h4>
                        {session.notes && (
                          <p className="text-sm text-gray-600 mt-1">{session.notes}</p>
                        )}
                      </div>
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
