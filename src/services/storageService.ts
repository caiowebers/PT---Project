import { Student, PhysicalEvaluation, BodyMeasurements, Workout, Exercise } from "../types";
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

const COLLECTION = "students";

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
      const querySnapshot = await getDocs(collection(db, COLLECTION));
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
      const docRef = doc(db, COLLECTION, student.id);
      await setDoc(docRef, student);
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

  subscribeToStudents: (callback: (students: Student[]) => void) => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      // Allow any authenticated user (Google or Anonymous) to see the list
      if (user) {
        unsubscribeSnapshot = onSnapshot(collection(db, COLLECTION), (snapshot) => {
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
  }
};
