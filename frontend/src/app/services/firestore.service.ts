import { Injectable, inject } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, DocumentData, Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private db: Firestore;
  private authService = inject(AuthService);

  constructor() {
    const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
    this.db = getFirestore(app, 'deml');
  }

  /**
   * Listens to real-time stats updates from the Django backend via Firestore.
   */
  getRealtimeStats(): Observable<DocumentData | undefined> {
    return new Observable(observer => {
      const firebaseUid = this.authService.auth?.currentUser?.uid;
      if (!firebaseUid) {
        observer.error('User not authenticated');
        return;
      }

      const docRef = doc(this.db, 'users', firebaseUid, 'data', 'stats');

      const unsubscribe = onSnapshot(
        docRef,
        docSnap => {
          if (docSnap.exists()) {
            observer.next(docSnap.data());
          } else {
            observer.next(undefined);
          }
        },
        error => {
          observer.error(error);
        },
      );

      // Cleanup on unsubscribe
      return () => unsubscribe();
    });
  }
}
