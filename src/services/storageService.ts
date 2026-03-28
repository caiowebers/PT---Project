import { Student } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from "firebase/firestore";

const COLLECTION = "students";

export const storageService = {
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
    return onSnapshot(collection(db, COLLECTION), (snapshot) => {
      const students = snapshot.docs.map(doc => doc.data() as Student);
      callback(students);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTION);
    });
  }
};
