import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import meetings.routing
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zoom_clone.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            meetings.routing.websocket_urlpatterns +
            chat.routing.websocket_urlpatterns
        )
    ),
})
