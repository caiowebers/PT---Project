import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot,
  collectionGroup,
  where,
  Timestamp
} from "firebase/firestore";
import { ActiveWorkoutProgress } from "../types";

const STUDENTS_COLLECTION = "students";
const PROGRESS_SUBCOLLECTION = "activeProgress";

export const progressService = {
  /**
   * Saves or updates current workout progress for a student.
   */
  saveProgress: async (progress: ActiveWorkoutProgress) => {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, progress.studentId, PROGRESS_SUBCOLLECTION, progress.workoutId);
      await setDoc(docRef, {
        ...progress,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${STUDENTS_COLLECTION}/${progress.studentId}/${PROGRESS_SUBCOLLECTION}/${progress.workoutId}`);
    }
  },

  /**
   * Gets current active progress for a specific workout.
   */
  getWorkoutProgress: async (studentId: string, workoutId: string): Promise<ActiveWorkoutProgress | null> => {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, studentId, PROGRESS_SUBCOLLECTION, workoutId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as ActiveWorkoutProgress) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${STUDENTS_COLLECTION}/${studentId}/${PROGRESS_SUBCOLLECTION}/${workoutId}`);
      return null;
    }
  },

  /**
   * Deletes progress once the workout is finalized.
   */
  clearProgress: async (studentId: string, workoutId: string) => {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, studentId, PROGRESS_SUBCOLLECTION, workoutId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${STUDENTS_COLLECTION}/${studentId}/${PROGRESS_SUBCOLLECTION}/${workoutId}`);
    }
  },

  /**
   * Subscribes to all active progress for a student (used by Admin).
   */
  subscribeToAllActiveProgress: (studentId: string, callback: (progress: ActiveWorkoutProgress[]) => void) => {
    const q = query(collection(db, STUDENTS_COLLECTION, studentId, PROGRESS_SUBCOLLECTION));
    return onSnapshot(q, (snapshot) => {
      const progress = snapshot.docs.map(doc => doc.data() as ActiveWorkoutProgress);
      callback(progress);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${STUDENTS_COLLECTION}/${studentId}/${PROGRESS_SUBCOLLECTION}`);
    });
  },

  /**
   * Subscribes to all active progress across all students for a specific admin.
   */
  subscribeToGlobalActiveProgress: (adminId: string, callback: (progress: ActiveWorkoutProgress[]) => void) => {
    const q = query(
      collectionGroup(db, PROGRESS_SUBCOLLECTION),
      where("adminId", "==", adminId)
    );
    return onSnapshot(q, (snapshot) => {
      const progress = snapshot.docs.map(doc => doc.data() as ActiveWorkoutProgress);
      callback(progress);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `collectionGroup/${PROGRESS_SUBCOLLECTION}`);
    });
  }
};
