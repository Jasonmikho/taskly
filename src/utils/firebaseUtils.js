import { Capacitor } from '@capacitor/core';

// Platform-specific Firestore operations
export async function getSavedTasks(userId) {
    try {
        if (Capacitor.isNativePlatform()) {
            // Use Capacitor Firebase Firestore plugin for native platforms
            const { FirebaseFirestore } = await import('@capacitor-firebase/firestore');

            const { snapshots } = await FirebaseFirestore.getCollection({
                reference: `users/${userId}/tasks`,
                queryConstraints: [
                    {
                        type: 'orderBy',
                        fieldPath: 'timestamp',
                        directionStr: 'desc',
                    },
                ],
            });

            return snapshots.map((snapshot) => ({
                id: snapshot.id,
                ...snapshot.data,
            }));
        } else {
            // Use Firebase web SDK for browser
            const { db } = await import('../firebase');
            const { collection, getDocs, orderBy, query } = await import('firebase/firestore');

            const q = query(collection(db, `users/${userId}/tasks`), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
    } catch (error) {
        console.error('Error getting saved tasks:', error);
        return [];
    }
}

// Save or update a task
export async function saveTask(userId, task) {
    try {
        if (Capacitor.isNativePlatform()) {
            // Use Capacitor Firebase Firestore plugin
            const { FirebaseFirestore } = await import('@capacitor-firebase/firestore');

            await FirebaseFirestore.setDocument({
                reference: `users/${userId}/tasks/${task.id}`,
                data: task,
                merge: true,
            });
        } else {
            // Use Firebase web SDK
            const { db } = await import('../firebase');
            const { setDoc, doc } = await import('firebase/firestore');

            const ref = doc(db, 'users', userId, 'tasks', String(task.id));
            await setDoc(ref, task);
        }

        // Return updated tasks list
        return getSavedTasks(userId);
    } catch (error) {
        console.error('Error saving task:', error);
        throw error;
    }
}

// Delete a task by ID
export async function deleteTaskById(userId, taskId) {
    try {
        if (Capacitor.isNativePlatform()) {
            // Use Capacitor Firebase Firestore plugin
            const { FirebaseFirestore } = await import('@capacitor-firebase/firestore');

            await FirebaseFirestore.deleteDocument({
                reference: `users/${userId}/tasks/${taskId}`,
            });
        } else {
            // Use Firebase web SDK
            const { db } = await import('../firebase');
            const { deleteDoc, doc } = await import('firebase/firestore');

            const ref = doc(db, 'users', userId, 'tasks', String(taskId));
            await deleteDoc(ref);
        }

        // Return updated tasks list
        return getSavedTasks(userId);
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}
