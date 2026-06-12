/**
 * room.js – WebRTC + WebSocket signaling for FELIX-LIVE
 * Uses Metered.ca TURN servers for cross-network video
 */

const peers = {};
let localStream = null;
let micEnabled = true;
let camEnabled = true;

const videoGrid = document.getElementById("video-grid");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");

// ── Fetch TURN credentials from our Django backend ─────────────────────────
async function getIceServers() {
  try {
    const res = await fetch("/meetings/ice-servers/");
    const data = await res.json();
    return data.iceServers;
  } catch {
    // Fallback to STUN only
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

let ICE_SERVERS_CONFIG = null;

// ── WebSocket ──────────────────────────────────────────────────────────────
const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(
  `${protocol}://${location.host}/ws/meeting/${ROOM_CODE}/`,
);
const chatSocket = new WebSocket(
  `${protocol}://${location.host}/ws/chat/${ROOM_CODE}/`,
);

socket.onmessage = async (e) => {
  const data = JSON.parse(e.data);

  if (data.type === "user-joined") {
    if (data.channel !== myChannel) {
      await createOffer(data.channel);
    }
  } else if (data.type === "my-channel") {
    myChannel = data.channel;
  } else if (data.type === "user-left") {
    removePeer(data.channel);
  } else if (data.type === "offer") {
    await handleOffer(data);
  } else if (data.type === "answer") {
    await handleAnswer(data);
  } else if (data.type === "ice-candidate") {
    await handleIceCandidate(data);
  }
};

chatSocket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  appendChatMessage(data.username, data.message);
};

let myChannel = null;

// ── Media ──────────────────────────────────────────────────────────────────
async function initMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  } catch {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert("Could not access camera or microphone: " + err.message);
      return;
    }
  }
  addVideoElement(localStream, "You", true);
}

function addVideoElement(stream, label, isLocal = false) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  if (isLocal) {
    video.muted = true;
    video.classList.add("local");
  }

  const name = document.createElement("span");
  name.textContent = label;
  name.style.cssText =
    "position:absolute;bottom:8px;left:12px;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:4px;font-size:0.8rem;color:white;";

  wrapper.appendChild(video);
  wrapper.appendChild(name);
  videoGrid.appendChild(wrapper);
  return wrapper;
}

// ── WebRTC ─────────────────────────────────────────────────────────────────
async function createOffer(targetChannel) {
  const pc = await createPeerConnection(targetChannel);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.send(
    JSON.stringify({ type: "offer", target: targetChannel, sdp: offer.sdp }),
  );
}

async function handleOffer(data) {
  const pc = await createPeerConnection(data.sender);
  await pc.setRemoteDescription(
    new RTCSessionDescription({ type: "offer", sdp: data.sdp }),
  );
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.send(
    JSON.stringify({ type: "answer", target: data.sender, sdp: answer.sdp }),
  );
}

async function handleAnswer(data) {
  const pc = peers[data.sender];
  if (pc)
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: "answer", sdp: data.sdp }),
    );
}

async function handleIceCandidate(data) {
  const pc = peers[data.sender];
  if (pc && data.candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

async function createPeerConnection(channelName) {
  if (!ICE_SERVERS_CONFIG) {
    ICE_SERVERS_CONFIG = await getIceServers();
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS_CONFIG });
  peers[channelName] = pc;

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(
        JSON.stringify({
          type: "ice-candidate",
          target: channelName,
          candidate: e.candidate,
        }),
      );
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`Peer ${channelName.slice(0, 8)} state: ${pc.connectionState}`);
    if (pc.connectionState === "failed") {
      removePeer(channelName);
    }
  };

  const remoteStream = new MediaStream();
  pc.ontrack = (e) => {
    e.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
  };

  const wrapper = addVideoElement(remoteStream, channelName.slice(0, 8));
  wrapper.dataset.channel = channelName;

  return pc;
}

function removePeer(channelName) {
  if (peers[channelName]) {
    peers[channelName].close();
    delete peers[channelName];
  }
  const el = document.querySelector(`[data-channel="${channelName}"]`);
  if (el) el.remove();
}

// ── Controls ───────────────────────────────────────────────────────────────
document.getElementById("btn-mic").addEventListener("click", () => {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  document.getElementById("btn-mic").classList.toggle("off", !micEnabled);
  document.getElementById("btn-mic").textContent = micEnabled ? "🎤" : "🔇";
});

document.getElementById("btn-cam").addEventListener("click", () => {
  if (!localStream) return;
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach((t) => (t.enabled = camEnabled));
  document.getElementById("btn-cam").classList.toggle("off", !camEnabled);
  document.getElementById("btn-cam").textContent = camEnabled ? "📷" : "🚫";
});

document.getElementById("btn-leave").addEventListener("click", () => {
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  socket.close();
  chatSocket.close();
  window.location.href = "/accounts/dashboard/";
});

// ── Chat ───────────────────────────────────────────────────────────────────
document.getElementById("btn-chat").addEventListener("click", () => {
  const panel = document.getElementById("chat-panel");
  panel.style.display = panel.style.display === "none" ? "flex" : "none";
});

document.getElementById("chat-send").addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatSocket.send(JSON.stringify({ message: msg }));
  chatInput.value = "";
}

function appendChatMessage(sender, text) {
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<div class="sender">${sender}</div><div class="text">${text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Copy room code on click
document.querySelector(".room-code").addEventListener("click", () => {
  navigator.clipboard.writeText(ROOM_CODE).then(() => {
    const el = document.querySelector(".room-code");
    el.textContent = "✅ Copied!";
    setTimeout(() => (el.textContent = `Code: ${ROOM_CODE}`), 2000);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────
initMedia();
