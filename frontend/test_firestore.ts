import { getFirestore, initializeApp } from 'firebase/app';
import { getFirestore as gf } from 'firebase/firestore';
const app = initializeApp({});
const db = gf(app, 'deml');
