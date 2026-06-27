import inspect

from firebase_admin import firestore

print(inspect.signature(firestore.client))
