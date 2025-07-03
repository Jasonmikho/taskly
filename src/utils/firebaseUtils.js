import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';

// Get all saved tasks for a user
export async function getSavedTasks(userId) {
    const snapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
    return snapshot.docs.map((doc) => doc.data());
}

// Save or update a task
export async function saveTask(userId, task) {
    const ref = doc(db, 'users', userId, 'tasks', String(task.id));
    await setDoc(ref, task);
    return getSavedTasks(userId);
}

// Delete a task by ID
export async function deleteTaskById(userId, taskId) {
    const ref = doc(db, 'users', userId, 'tasks', String(taskId));
    await deleteDoc(ref);
    return getSavedTasks(userId);
}
