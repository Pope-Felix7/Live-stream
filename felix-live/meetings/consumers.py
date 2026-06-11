import json
from channels.generic.websocket import AsyncWebsocketConsumer

class MeetingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'meeting_{self.room_code}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user': self.scope['user'].username,
                'channel': self.channel_name,
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user': self.scope['user'].username,
                'channel': self.channel_name,
            }
        )
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        # Relay WebRTC signaling messages
        if msg_type in ('offer', 'answer', 'ice-candidate'):
            target = data.get('target')
            await self.channel_layer.send(
                target,
                {
                    'type': 'signaling_message',
                    'data': data,
                    'sender': self.channel_name,
                }
            )

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user-joined',
            'user': event['user'],
            'channel': event['channel'],
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user-left',
            'user': event['user'],
            'channel': event['channel'],
        }))

    async def signaling_message(self, event):
        await self.send(text_data=json.dumps({
            **event['data'],
            'sender': event['sender'],
        }))
