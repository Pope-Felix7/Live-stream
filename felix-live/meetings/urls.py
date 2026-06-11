from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_room, name='create_room'),
    path('join/', views.join_room, name='join_room'),
    path('ice-servers/', views.ice_servers, name='ice_servers'),
    path('<uuid:code>/', views.room, name='room'),
]
