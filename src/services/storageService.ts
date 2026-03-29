import { Student, PhysicalEvaluation, BodyMeasurements, Workout, Exercise, ClassSession, UserProfile } from "../types";
import { db, handleFirestoreError, OperationType, auth, onAuthStateChanged } from "../firebase";
import { v4 as uuidv4 } from "uuid";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";

const STUDENTS_SUBCOLLECTION = "students";
const SESSIONS_SUBCOLLECTION = "aulas";

// ============================================================================
// Helper Functions - Caminhos únicos por utilizador
// ============================================================================

/**
 * Gera caminho único para alunos de cada utilizador
 * Formato: users/{uid}/students
 */
function getUserStudentsPath(uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) throw new Error("Utilizador não autenticado. Não é possível aceder aos dados.");
  return `users/${userId}/${STUDENTS_SUBCOLLECTION}`;
}

/**
 * Gera caminho único para aulas de cada utilizador
 * Formato: users/{uid}/aulas
 */
function getUserSessionsPath(uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) throw new Error("Utilizador não autenticado. Não é possível aceder aos dados.");
  return `users/${userId}/${SESSIONS_SUBCOLLECTION}`;
}

/**
 * Garante que o utilizador está autenticado
 * Lança erro se não houver UID
 */
function ensureAuthenticated(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Utilizador não autenticado.");
  return uid;
}

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Por favor verifica a tua ligação ao Firebase.");
      import("sonner").then(({ toast }) => {
        toast.error("Erro de ligação ao Firebase. Verifique a sua internet ou configuração.");
      });
    }
  }
}
testConnection();

export const storageService = {
  generateTestStudent: async () => {
    const uid = ensureAuthenticated();
    const id = uuidv4();
    const shareSlug = uuidv4().slice(0, 8);
    const testStudent: Student = {
      id,
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
              gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsZ2lmX2J5X2lkJmN0PQ/3o7TKv6eSgLJLpK74A/giphy.gif",
              description: "Sente-se na máquina, segure a barra com pegada aberta. Puxe a barra em direção ao peito, mantendo as costas retas."
            }
          ]
        }
      ]
    };

    try {
      const docRef = doc(db, getUserStudentsPath(uid), id);
      await setDoc(docRef, testStudent);
      console.log(`✓ Aluno teste criado para utilizador ${uid}`);
      return testStudent;
    } catch (error) {
      console.error("Erro ao criar aluno teste:", error);
      handleFirestoreError(error, OperationType.WRITE, `${getUserStudentsPath(uid)}/${id}`);
      throw error;
    }
  },

  getStudents: async (): Promise<Student[]> => {
    try {
      const uid = ensureAuthenticated();
      const querySnapshot = await getDocs(collection(db, getUserStudentsPath(uid)));
      return querySnapshot.docs.map(doc => doc.data() as Student);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      handleFirestoreError(error, OperationType.GET, getUserStudentsPath());
      return [];
    }
  },

  getStudentById: async (id: string): Promise<Student | undefined> => {
    try {
      const uid = ensureAuthenticated();
      const docRef = doc(db, getUserStudentsPath(uid), id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Student) : undefined;
    } catch (error) {
      console.error("Erro ao carregar aluno:", error);
      handleFirestoreError(error, OperationType.GET, `${getUserStudentsPath()}/${id}`);
      return undefined;
    }
  },

  getStudentBySlug: async (slug: string): Promise<Student | undefined> => {
    try {
      const uid = ensureAuthenticated();
      const q = query(
        collection(db, getUserStudentsPath(uid)), 
        where("shareSlug", "==", slug)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Student;
      }
      return undefined;
    } catch (error) {
      console.error("Erro ao procurar aluno por slug:", error);
      handleFirestoreError(error, OperationType.GET, `${getUserStudentsPath()}?shareSlug=${slug}`);
      return undefined;
    }
  },

  saveStudent: async (student: Student) => {
    try {
      const uid = ensureAuthenticated();
      const docRef = doc(db, getUserStudentsPath(uid), student.id);
      await setDoc(docRef, student);
      console.log(`✓ Aluno ${student.name} guardado com sucesso para ${uid}`);
    } catch (error) {
      console.error("Erro ao guardar aluno:", error);
      handleFirestoreError(error, OperationType.WRITE, `${getUserStudentsPath()}/${student.id}`);
      throw error;
    }
  },

  deleteStudent: async (id: string) => {
    try {
      const uid = ensureAuthenticated();
      const docRef = doc(db, getUserStudentsPath(uid), id);
      await deleteDoc(docRef);
      console.log(`✓ Aluno eliminado com sucesso`);
    } catch (error) {
      console.error("Erro ao eliminar aluno:", error);
      handleFirestoreError(error, OperationType.DELETE, `${getUserStudentsPath()}/${id}`);
      throw error;
    }
  },

  getCurrentUserId: () => {
    return auth.currentUser?.uid;
  },

  // ============================================================================
  // Session Management (Aulas)
  // ============================================================================

  getSessions: async (): Promise<ClassSession[]> => {
    try {
      const uid = ensureAuthenticated();
      const querySnapshot = await getDocs(collection(db, getUserSessionsPath(uid)));
      return querySnapshot.docs.map(doc => doc.data() as ClassSession);
    } catch (error) {
      console.error("Erro ao carregar aulas:", error);
      handleFirestoreError(error, OperationType.GET, getUserSessionsPath());
      return [];
    }
  },

  saveSession: async (session: ClassSession) => {
    try {
      const uid = ensureAuthenticated();
      const docRef = doc(db, getUserSessionsPath(uid), session.id);
      await setDoc(docRef, session);
      console.log(`✓ Aula agendada com sucesso para ${uid}`);
    } catch (error) {
      console.error("Erro ao guardar aula:", error);
      handleFirestoreError(error, OperationType.WRITE, `${getUserSessionsPath()}/${session.id}`);
      throw error;
    }
  },

  deleteSession: async (id: string) => {
    try {
      const uid = ensureAuthenticated();
      const docRef = doc(db, getUserSessionsPath(uid), id);
      await deleteDoc(docRef);
      console.log(`✓ Aula eliminada com sucesso`);
    } catch (error) {
      console.error("Erro ao eliminar aula:", error);
      handleFirestoreError(error, OperationType.DELETE, `${getUserSessionsPath()}/${id}`);
      throw error;
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
        try {
          unsubscribeSnapshot = onSnapshot(
            collection(db, getUserSessionsPath(user.uid)),
            (snapshot) => {
              const sessions = snapshot.docs.map(doc => doc.data() as ClassSession);
              callback(sessions);
              console.log(`✓ ${sessions.length} aula(s) carregada(s) para ${user.email}`);
            },
            (error) => {
              console.error("Erro ao subscrever aulas:", error);
              handleFirestoreError(error, OperationType.GET, getUserSessionsPath(user.uid));
              callback([]);
            }
          );
        } catch (error) {
          console.error("Erro ao configurar subscrição de aulas:", error);
          callback([]);
        }
      } else {
        callback([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  },

  subscribeToStudents: (callback: (students: Student[]) => void) => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      if (user) {
        try {
          unsubscribeSnapshot = onSnapshot(
            collection(db, getUserStudentsPath(user.uid)),
            (snapshot) => {
              const students = snapshot.docs.map(doc => doc.data() as Student);
              callback(students);
              console.log(`✓ ${students.length} aluno(s) carregado(s) para ${user.email}`);
            },
            (error) => {
              console.error("Erro ao subscrever alunos:", error);
              handleFirestoreError(error, OperationType.GET, getUserStudentsPath(user.uid));
              callback([]);
            }
          );
        } catch (error) {
          console.error("Erro ao configurar subscrição de alunos:", error);
          callback([]);
        }
      } else {
        callback([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  },

  // ============================================================================
  // User Profile Management
  // ============================================================================

  saveUserProfile: async (userProfile: UserProfile) => {
    try {
      const docRef = doc(db, "users", userProfile.uid);
      await setDoc(docRef, userProfile);
      console.log(`✓ Perfil guardado com sucesso para ${userProfile.email}`);
    } catch (error) {
      console.error("Erro ao guardar perfil:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${userProfile.uid}`);
      throw error;
    }
  },

  getUserProfile: async (uid: string): Promise<UserProfile | undefined> => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return undefined;
    } catch (error) {
      console.warn(`Aviso ao ler perfil do utilizador ${uid}:`, error);
      return undefined;
    }
  },

  createUserProfile: async (uid: string, email: string, displayName?: string): Promise<UserProfile> => {
    const userProfile: UserProfile = {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'client',
      isActive: true
    };

    try {
      await storageService.saveUserProfile(userProfile);
      console.log(`✓ Perfil criado com sucesso para: ${email}`);
      return userProfile;
    } catch (error) {
      console.error(`✗ Erro ao criar perfil para ${email}:`, error);
      throw error;
    }
  }
};
