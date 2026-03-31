import { Student, PhysicalEvaluation, BodyMeasurements, Workout, Exercise, ClassSession, AdminSettings } from "../types";
import { db, handleFirestoreError, OperationType, auth, onAuthStateChanged } from "../firebase";
import { v4 as uuidv4 } from "uuid";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";

const COLLECTION = "students";
const SESSIONS_COLLECTION = "aulas";
const SETTINGS_COLLECTION = "settings";

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
      import("sonner").then(({ toast }) => {
        toast.error("Erro de ligação ao Firebase. Verifique a sua internet ou configuração.");
      });
    }
  }
}
testConnection();

export const storageService = {
  generateTestStudent: async () => {
    const id = uuidv4();
    const shareSlug = uuidv4().slice(0, 8);
    const testStudent: Student = {
      id,
      adminId: auth.currentUser?.uid || "anonymous",
      shareSlug,
      name: `Aluno Teste ${Math.floor(Math.random() * 1000)}`,
      age: 25 + Math.floor(Math.random() * 10),
      goal: "Hipertrofia e Condicionamento",
      startDate: new Date().toISOString().split('T')[0],
      notes: "Este é um aluno gerado automaticamente para testes.",
      evaluations: [
        {
          date: new Date().toISOString().split('T')[0],
          weight: 75,
          height: 175,
          bmi: 24.5,
          bmr: 1800,
          maxHr: 190
        }
      ],
      measurements: [
        {
          date: new Date().toISOString().split('T')[0],
          chest: 100,
          bicepsR: 35,
          bicepsL: 35,
          waist: 80,
          abdomen: 82,
          hips: 95,
          thighR: 55,
          thighL: 55,
          calfR: 38,
          calfL: 38
        }
      ],
      workouts: [
        {
          id: uuidv4(),
          name: "Treino A - Superior",
          exercises: [
            {
              id: uuidv4(),
              name: "Supino Reto",
              category: "Principal",
              reps: "3x12",
              rest: "60s",
              gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eSgLJLpK74A/giphy.gif",
              description: "Deite-se no banco, segure a barra com as mãos um pouco mais largas que os ombros. Desça a barra até o peito e empurre para cima."
            },
            {
              id: uuidv4(),
              name: "Puxada Frontal",
              category: "Principal",
              reps: "3x12",
              rest: "60s",
              gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eSgLJLpK74A/giphy.gif",
              description: "Sente-se na máquina, segure a barra com pegada aberta. Puxe a barra em direção ao peito, mantendo as costas retas."
            }
          ]
        }
      ]
    };

    try {
      const docRef = doc(db, COLLECTION, id);
      await setDoc(docRef, testStudent);
      return testStudent;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION}/${id}`);
      throw error;
    }
  },

  getStudents: async (): Promise<Student[]> => {
    try {
      const user = auth.currentUser;
      if (!user) return [];
      const q = query(collection(db, COLLECTION), where("adminId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Student);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION);
      return [];
    }
  },

  getStudentById: async (id: string): Promise<Student | undefined> => {
    try {
      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Student) : undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
      return undefined;
    }
  },

  getStudentBySlug: async (slug: string): Promise<Student | undefined> => {
    try {
      const q = query(collection(db, COLLECTION), where("shareSlug", "==", slug));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Student;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION}?shareSlug=${slug}`);
      return undefined;
    }
  },

  saveStudent: async (student: Student) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
      
      const studentData = {
        ...student,
        adminId: student.adminId || user.uid
      };
      const docRef = doc(db, COLLECTION, student.id);
      await setDoc(docRef, studentData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION}/${student.id}`);
    }
  },

  deleteStudent: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
    }
  },

  getCurrentUserId: () => {
    return auth.currentUser?.uid;
  },

  // Session Management
  getSessions: async (): Promise<ClassSession[]> => {
    try {
      const user = auth.currentUser;
      if (!user) return [];
      const q = query(collection(db, SESSIONS_COLLECTION), where("instructorId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ClassSession);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, SESSIONS_COLLECTION);
      return [];
    }
  },

  saveSession: async (session: ClassSession) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      const sessionData = {
        ...session,
        instructorId: session.instructorId || user.uid
      };
      const docRef = doc(db, SESSIONS_COLLECTION, session.id);
      await setDoc(docRef, sessionData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SESSIONS_COLLECTION}/${session.id}`);
    }
  },

  salvarAula: async (studentId: string, start: any, end: any, studentName: string, workoutTitle: string, notes?: string, googleEventId?: string, status: 'pending' | 'scheduled' = 'scheduled') => {
    try {
      const user = auth.currentUser;
      // If no user, it's a student requesting via shareSlug
      // We need to find the adminId for this student
      let adminId = user?.uid;
      
      if (!adminId) {
        const student = await storageService.getStudentById(studentId);
        adminId = student?.adminId;
      }

      if (!adminId) throw new Error("Admin ID não encontrado");

      const id = uuidv4();
      const aula: ClassSession = {
        id,
        studentId,
        studentName,
        instructorId: adminId,
        workoutTitle,
        start: start.toISOString ? start.toISOString() : String(start),
        end: end.toISOString ? end.toISOString() : String(end),
        status: status,
        notes: notes || "",
        googleEventId: googleEventId || ""
      };

      await setDoc(doc(db, SESSIONS_COLLECTION, id), aula);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, SESSIONS_COLLECTION);
      throw error;
    }
  },

  deleteSession: async (id: string) => {
    try {
      const docRef = doc(db, SESSIONS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${SESSIONS_COLLECTION}/${id}`);
    }
  },

  subscribeToSessions: (callback: (sessions: ClassSession[]) => void) => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      if (user) {
        const q = query(collection(db, SESSIONS_COLLECTION), where("instructorId", "==", user.uid));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const sessions = snapshot.docs.map(doc => doc.data() as ClassSession);
          callback(sessions);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, SESSIONS_COLLECTION);
        });
      } else {
        callback([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  },

  subscribeToStudentSessions: (studentId: string, callback: (sessions: ClassSession[]) => void) => {
    const q = query(collection(db, SESSIONS_COLLECTION), where("studentId", "==", studentId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as ClassSession);
      callback(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, SESSIONS_COLLECTION);
    });
    return unsubscribe;
  },

  subscribeToStudents: (callback: (students: Student[]) => void) => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      // Allow any authenticated user to see their own list
      if (user) {
        const q = query(collection(db, COLLECTION), where("adminId", "==", user.uid));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const students = snapshot.docs.map(doc => doc.data() as Student);
          callback(students);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, COLLECTION);
        });
      } else {
        callback([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  },

  // Admin Settings
  getAdminSettings: async (adminId: string): Promise<AdminSettings | undefined> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, adminId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as AdminSettings) : undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${adminId}`);
      return undefined;
    }
  },

  saveAdminSettings: async (settings: AdminSettings) => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, settings.id);
      await setDoc(docRef, settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${settings.id}`);
    }
  }
};
