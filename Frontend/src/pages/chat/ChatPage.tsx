import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  Send,
  Phone,
  Video,
  Info,
  Smile,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Link2,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ChatMessage } from "../../components/chat/ChatMessage";
import { ChatUserList } from "../../components/chat/ChatUserList";
import { useAuth } from "../../context/AuthContext";
import { Message, ChatConversation } from "../../types";
import { findUserById } from "../../data/users";
import {
  getMessagesBetweenUsers,
  sendMessage,
  getConversationsForUser,
} from "../../data/messages";
import { MessageCircle } from "lucide-react";
import { API_BASE_URL } from "../../lib/api";
import { createMeetingRoom } from "../../lib/meetings";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [meetingIdInput, setMeetingIdInput] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const chatPartner = userId ? findUserById(userId) : null;

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
      return (
        (error.response?.data as { message?: string } | undefined)?.message ||
        fallback
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  };

  useEffect(() => {
    if (currentUser) {
      setConversations(getConversationsForUser(currentUser.id));
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && userId) {
      setMessages(getMessagesBetweenUsers(currentUser.id, userId));
    }
  }, [currentUser, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const createPeerConnection = (targetSocketId: string, roomId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    remoteSocketIdRef.current = targetSocketId;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current as MediaStream);
      });
    }

    peerConnection.ontrack = (event) => {
      const [incomingStream] = event.streams;
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      incomingStream.getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track);
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && remoteSocketIdRef.current) {
        socketRef.current.emit("ice-candidate", {
          roomId,
          targetId: remoteSocketIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const handleIncomingOffer = async (
    roomId: string,
    from: string,
    offer: RTCSessionDescriptionInit,
  ) => {
    const peerConnection = createPeerConnection(from, roomId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current?.emit("answer", {
      roomId,
      targetId: from,
      answer,
    });
  };

  const createAndSendOffer = async (targetSocketId: string, roomId: string) => {
    const peerConnection = createPeerConnection(targetSocketId, roomId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current?.emit("offer", {
      roomId,
      targetId: targetSocketId,
      offer,
    });
  };

  const setupLocalMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    remoteStreamRef.current = new MediaStream();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  };

  const connectSignaling = async (roomId: string) => {
    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { roomId });
    });

    socket.on("connect_error", (error) => {
      toast.error(error.message || "Signaling connection failed.");
      endCall();
    });

    socket.on("room-denied", ({ message }: { message?: string }) => {
      toast.error(message || "Access denied to this room.");
      endCall();
    });

    socket.on("room-users", async ({ users }: { users: string[] }) => {
      if (users.length > 0) {
        await createAndSendOffer(users[0], roomId);
      }
    });

    socket.on("user-joined", async ({ socketId }: { socketId: string }) => {
      await createAndSendOffer(socketId, roomId);
    });

    socket.on(
      "offer",
      async ({
        from,
        offer,
      }: {
        from: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        await handleIncomingOffer(roomId, from, offer);
      },
    );

    socket.on(
      "answer",
      async ({
        answer,
      }: {
        from: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        if (!peerConnectionRef.current) {
          return;
        }

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      },
    );

    socket.on(
      "ice-candidate",
      async ({
        candidate,
      }: {
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        }
      },
    );

    socket.on("user-left", () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = new MediaStream();
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    });
  };

  const joinRoom = async () => {
    const roomId = roomIdInput.trim();
    if (!roomId) {
      toast.error("Enter a room ID to join call.");
      return;
    }

    try {
      await setupLocalMedia();
      await connectSignaling(roomId);
      setIsInCall(true);
      setAudioEnabled(true);
      setVideoEnabled(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to join call room."));
      endCall();
    }
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    const nextState = !audioEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setAudioEnabled(nextState);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    const nextState = !videoEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setVideoEnabled(nextState);
  };

  const endCall = () => {
    const roomId = roomIdInput.trim();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      if (roomId) {
        socketRef.current.emit("user-left", { roomId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    remoteSocketIdRef.current = null;
    setIsInCall(false);
  };

  const handleCreateRoom = async () => {
    if (!meetingIdInput.trim()) {
      toast.error("Enter a meeting ID first.");
      return;
    }

    setIsRoomLoading(true);
    try {
      const roomId = await createMeetingRoom(meetingIdInput.trim());
      setRoomIdInput(roomId);
      toast.success("Meeting room created.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create meeting room."));
    } finally {
      setIsRoomLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentUser || !userId) return;

    const message = sendMessage({
      senderId: currentUser.id,
      receiverId: userId,
      content: newMessage,
    });

    setMessages([...messages, message]);
    setNewMessage("");

    setConversations(getConversationsForUser(currentUser.id));
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>

      <div className="flex-1 flex flex-col">
        {chatPartner ? (
          <>
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <Avatar
                  src={chatPartner.avatarUrl}
                  alt={chatPartner.name}
                  size="md"
                  status={chatPartner.isOnline ? "online" : "offline"}
                  className="mr-3"
                />

                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {chatPartner.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {chatPartner.isOnline ? "Online" : "Last seen recently"}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Voice call"
                >
                  <Phone size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Video call"
                  onClick={() => setShowCallPanel((prev) => !prev)}
                >
                  <Video size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Info"
                >
                  <Info size={18} />
                </Button>
              </div>
            </div>

            {showCallPanel && (
              <div className="border-b border-gray-200 p-4 bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Meeting ID"
                    placeholder="Meeting Mongo ID"
                    value={meetingIdInput}
                    onChange={(event) => setMeetingIdInput(event.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Room ID"
                    placeholder="Room UUID"
                    value={roomIdInput}
                    onChange={(event) => setRoomIdInput(event.target.value)}
                    fullWidth
                  />
                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      fullWidth
                      isLoading={isRoomLoading}
                      leftIcon={<Link2 size={16} />}
                      onClick={handleCreateRoom}
                    >
                      Create Room
                    </Button>
                    <Button fullWidth onClick={joinRoom} disabled={isInCall}>
                      Join Room
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-black aspect-video overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="rounded-lg bg-black aspect-video overflow-hidden">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={audioEnabled ? "outline" : "warning"}
                    onClick={toggleAudio}
                    disabled={!isInCall}
                    leftIcon={
                      audioEnabled ? <Mic size={16} /> : <MicOff size={16} />
                    }
                  >
                    {audioEnabled ? "Mute" : "Unmute"}
                  </Button>
                  <Button
                    variant={videoEnabled ? "outline" : "warning"}
                    onClick={toggleVideo}
                    disabled={!isInCall}
                    leftIcon={
                      videoEnabled ? (
                        <Video size={16} />
                      ) : (
                        <VideoOff size={16} />
                      )
                    }
                  >
                    {videoEnabled ? "Stop Video" : "Start Video"}
                  </Button>
                  <Button
                    variant="error"
                    onClick={endCall}
                    disabled={!isInCall}
                    leftIcon={<PhoneOff size={16} />}
                  >
                    End Call
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isCurrentUser={message.senderId === currentUser.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <MessageCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">
                    No messages yet
                  </h3>
                  <p className="text-gray-500 mt-1">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Add emoji"
                >
                  <Smile size={20} />
                </Button>

                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">
              Select a conversation
            </h2>
            <p className="text-gray-500 mt-2 text-center">
              Choose a contact from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
