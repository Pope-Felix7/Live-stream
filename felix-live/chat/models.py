from django.db import models
from django.contrib.auth.models import User

class ChatMessage(models.Model):
    room_code = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.room_code}] {self.user.username}: {self.message[:40]}"
