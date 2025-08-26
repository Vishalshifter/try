import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAqa8QoxK89kqJr5b2kj54V4OSA78Pmvg0",
  authDomain: "mom-notes-6f5b4.firebaseapp.com",
  projectId: "mom-notes-6f5b4",
  storageBucket: "mom-notes-6f5b4.appspot.com",
  messagingSenderId: "820704893889",
  appId: "1:820704893889:web:0943c49d6535a947176d40",
  measurementId: "G-N5W8FEZBCS"
};

// Initialize Firebase for client-side
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
// Use long polling to avoid WebChannel 400s/offline issues on some networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
// Only initialize Analytics in the browser to avoid SSR "window is not defined"
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : undefined as any;

export default app;
