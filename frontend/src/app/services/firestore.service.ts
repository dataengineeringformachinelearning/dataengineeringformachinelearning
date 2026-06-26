import { Injectable, inject } from '@angular/core';
import { initializeApp } from 'firebase/app';
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
    const app = initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }

  /**
   * Listens to real-time stats updates from the Django backend via Firestore.
   */
  getRealtimeStats(): Observable<DocumentData | undefined> {
    return new Observable(observer => {
      const user = this.authService.getCurrentUser();
      if (!user) {
        observer.error('User not authenticated');
        return;
      }

      const docRef = doc(this.db, 'users', user.id.toString(), 'data', 'stats');

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
