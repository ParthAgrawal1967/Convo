import React, { useEffect, useRef, useState } from "react";
import "../styles/VideoComponent.css";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { io } from "socket.io-client";

const server_url = "http://localhost:8000";

var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef([]);

  const [videos, setVideos] = useState([]);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState();
  const [audio, setAudio] = useState();
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");

  /* -------------------- MEDIA HELPERS -------------------- */

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  /* -------------------- PERMISSIONS -------------------- */

  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setVideoAvailable(true);
      setAudioAvailable(true);

      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.log(err);
    }
  };

  /* -------------------- MEDIA SWITCH -------------------- */

  const getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch {}

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
        });
      });
    }
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(console.log);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  /* -------------------- SIGNAL HANDLER -------------------- */

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId === socketIdRef.current) return;

    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId].createAnswer().then((description) => {
              connections[fromId]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({
                      sdp: connections[fromId].localDescription
                    })
                  );
                });
            });
          }
        });
    }

    if (signal.ice) {
      connections[fromId].addIceCandidate(
        new RTCIceCandidate(signal.ice)
      );
    }
  };

  /* -------------------- SOCKET CONNECTION -------------------- */

  const connectToSocketServer = () => {
    socketRef.current = io(server_url);
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            console.log("REMOTE STREAM RECEIVED FROM", socketListId);

            const exists = videoRef.current.find(
              (v) => v.socketId === socketListId
            );

            if (!exists) {
              const newVideo = {
                socketId: socketListId,
                stream: event.stream
              };

              setVideos((videos) => {
                const updated = [...videos, newVideo];
                videoRef.current = updated;
                return updated;
              });
            }
          };

          if (window.localStream) {
            connections[socketListId].addStream(window.localStream);
            console.log("LOCAL STREAM ADDED TO", socketListId);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({
                      sdp: connections[id2].localDescription
                    })
                  );
                });
            });
          }
        }
      });
    });
  };

  /* -------------------- UI ACTIONS -------------------- */

  const connect = () => {
    setAskForUsername(false);
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div>
      {askForUsername ? (
        <div>
          <h2>Enter into lobby</h2>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <video ref={localVideoRef} autoPlay muted />
        </div>
      ) : (
        <>
          <video ref={localVideoRef} autoPlay muted />

          {videos.map((video) => (
            <div key={video.socketId}>
              <h3>{video.socketId}</h3>
              <video
                autoPlay
                ref={(ref) => {
                  if (ref) ref.srcObject = video.stream;
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
