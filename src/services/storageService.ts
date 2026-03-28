import { Student } from "../types";

const STORAGE_KEY = "gymflow_students";

export const storageService = {
  getStudents: (): Student[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getStudentById: (id: string): Student | undefined => {
    const students = storageService.getStudents();
    return students.find(s => s.id === id);
  },

  getStudentBySlug: (slug: string): Student | undefined => {
    const students = storageService.getStudents();
    return students.find(s => s.shareSlug === slug);
  },

  saveStudent: (student: Student) => {
    const students = storageService.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    
    if (index >= 0) {
      students[index] = student;
    } else {
      students.push(student);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  },

  deleteStudent: (id: string) => {
    const students = storageService.getStudents();
    const filtered = students.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};
