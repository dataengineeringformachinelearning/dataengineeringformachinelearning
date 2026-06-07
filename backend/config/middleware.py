import logging
from django.contrib.auth.models import User, AnonymousUser
from django.utils.deprecation import MiddlewareMixin
from firebase_admin import auth

logger = logging.getLogger(__name__)

class FirebaseAuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.user = AnonymousUser()
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        try:
            # Verify the Firebase ID token
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
            name = decoded_token.get('name') or decoded_token.get('display_name', '')
            
            # Find or create local Django User corresponding to Firebase UID
            user, created = User.objects.get_or_create(username=uid)
            if created:
                user.email = email or ""
                user.first_name = name or ""
                # Set an unusable password since authentication is offloaded to Firebase
                user.set_unusable_password()
                user.save()
                logger.info(f"Created Django user for Firebase UID: {uid}")
            else:
                # Keep email and display name in sync if they changed
                updated = False
                if email and user.email != email:
                    user.email = email
                    updated = True
                if name and user.first_name != name:
                    user.first_name = name
                    updated = True
                if updated:
                    user.save()
            
            # Authenticate the request with this user
            request.user = user
            
        except Exception as e:
            logger.error(f"Firebase token verification failed: {e}")
            # If token verification fails, request.user remains AnonymousUser
            pass
        
        return None
