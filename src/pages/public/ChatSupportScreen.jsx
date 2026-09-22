import { useEffect, useMemo, useState } from "react";
import { FaComments, FaPaperPlane, FaPlus, FaSyncAlt } from "react-icons/fa";
import { apiFetch } from "../../services/api";

const emptyStartForm = {
  name: "",
  subject: "Blood Request Help",
  message: "",
};

const supportTopics = [
  "Blood Request Help",
  "Find Donor",
  "Donation Eligibility",
  "Account or Login Issue",
  "Update Donor Profile",
  "Emergency Support",
  "Other Question",
];

const quickReplies = [
  {
    label: "Request Status",
    text: "Your blood request is being reviewed by our admin team. Please keep your phone available; we will contact you if a matching donor is found.",
  },
  {
    label: "Emergency Help",
    text: "Please submit an emergency blood request with blood group, hospital name, location, and contact number. For urgent help, call 077 123 4567.",
  },
  {
    label: "Find Donor",
    text: "Go to Find Donors, select the required blood group and location, then check available donors. If no donor is available, submit a blood request so admin can help coordinate.",
  },
  {
    label: "Eligibility",
    text: "Generally, donors should be healthy, above 18 years, and meet weight and medical requirements. If you recently had illness, surgery, or medication, please consult medical staff before donating.",
  },
  {
    label: "Login Issue",
    text: "Please check your username and password. If you forgot your password, use the forgot password option or send your registered username/contact number for admin support.",
  },
  {
    label: "Profile Update",
    text: "Please go to My Profile and update your details. If saving fails, check required fields like phone number and location, then try again.",
  },
  {
    label: "Close Reply",
    text: "Thank you for contacting Blood Bridge support. We are closing this conversation now. Please start a new chat if you need more help.",
  },
];

function getSender(user, guestName = "Guest") {
  return {
    senderId: user?.id || "",
    senderName: user?.fullName || guestName || "Guest",
    senderRole: user?.role || "guest",
  };
}

// Support chat page. Guests can open a conversation; admins get an inbox and can reply.
function ChatSupportScreen({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";
  const userName = currentUser?.fullName || "";
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [startForm, setStartForm] = useState({
    ...emptyStartForm,
    name: userName,
  });
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const canLoadConversations = isAdmin || Boolean(currentUser?.id);

  const loadConversations = async () => {
    if (!canLoadConversations) return;

    setIsLoading(true);
    try {
      const query = isAdmin
        ? "?role=admin"
        : `?role=${encodeURIComponent(currentUser.role)}&userId=${encodeURIComponent(currentUser.id)}`;
      const data = await apiFetch(`/chat/conversations${query}`);
      setConversations(data);
      setActiveConversationId((current) => current || data[0]?.id || "");
    } catch (error) {
      console.error("Failed to load chat conversations:", error);
      setNotice(error.message || "Unable to load chat conversations.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      setNotice(error.message || "Unable to load chat messages.");
    }
  };

  const refreshChat = async () => {
    await loadConversations();
    if (activeConversationId) {
      await loadMessages(activeConversationId);
    }
  };

  useEffect(() => {
    setStartForm((current) => ({ ...current, name: userName || current.name }));
  }, [userName]);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return undefined;

    const refreshTimer = setInterval(() => {
      loadMessages(activeConversationId);
    }, 5000);

    return () => clearInterval(refreshTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const updateStartForm = (field, value) => {
    setStartForm((current) => ({ ...current, [field]: value }));
  };

  const startConversation = async (event) => {
    event.preventDefault();
    setNotice("");
    setIsSending(true);

    try {
      const conversation = await apiFetch("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          userId: currentUser?.id || "",
          userName: currentUser?.fullName || startForm.name,
          userRole: currentUser?.role || "guest",
          subject: startForm.subject,
          message: startForm.message,
        }),
      });
      setConversations((existing) => [conversation, ...existing]);
      setActiveConversationId(conversation.id);
      setStartForm({ ...emptyStartForm, name: currentUser?.fullName || startForm.name });
      setNotice("Your support conversation was created.");
    } catch (error) {
      console.error("Failed to create chat conversation:", error);
      setNotice(error.message || "Unable to create support conversation.");
    } finally {
      setIsSending(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!activeConversationId) return;

    setNotice("");
    setIsSending(true);

    try {
      const sender = getSender(currentUser, startForm.name || activeConversation?.userName);
      const message = await apiFetch(`/chat/conversations/${activeConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ ...sender, message: reply }),
      });
      setMessages((existing) => [...existing, message]);
      setReply("");
      setConversations((existing) =>
        existing.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, status: "Open", lastMessageAt: message.createdAt }
            : conversation
        )
      );
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setNotice(error.message || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const closeConversation = async () => {
    if (!activeConversationId) return;

    try {
      const updated = await apiFetch(`/chat/conversations/${activeConversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Closed" }),
      });
      setConversations((existing) =>
        existing.map((conversation) => (conversation.id === updated.id ? updated : conversation))
      );
      setNotice("Conversation closed.");
    } catch (error) {
      console.error("Failed to close conversation:", error);
      setNotice(error.message || "Unable to close conversation.");
    }
  };

  return (
    <section className="page info-page chat-page">
      <div className="info-hero chat-hero">
        <p className="eyebrow">Chat Support</p>
        <h1>{isAdmin ? "Support inbox" : "Talk with Blood Bridge support."}</h1>
        <p>
          {isAdmin
            ? "Review support conversations, reply to users and donors, and close resolved requests."
            : "Send your question about donor search, blood requests, account access, or donation help."}
        </p>
      </div>

      <div className="chat-workspace">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-head">
            <h2>{isAdmin ? "Inbox" : "Conversations"}</h2>
            <button aria-label="Refresh conversations and messages" onClick={refreshChat} type="button">
              <FaSyncAlt />
            </button>
          </div>
          {isLoading ? <p className="empty-state">Loading conversations...</p> : null}
          <div className="chat-thread-list">
            {conversations.map((conversation) => (
              <button
                className={conversation.id === activeConversationId ? "active" : ""}
                key={conversation.id}
                onClick={() => setActiveConversationId(conversation.id)}
                type="button"
              >
                <strong>{conversation.subject}</strong>
                <span>{conversation.userName} - {conversation.status}</span>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="empty-state">
                {isAdmin ? "No support conversations yet." : "Start a conversation and replies will appear here."}
              </p>
            )}
          </div>
        </aside>

        <section className="chat-panel">
          {activeConversation ? (
            <>
              <div className="chat-panel-head">
                <div>
                  <h2>{activeConversation.subject}</h2>
                  <p>{activeConversation.userName} - {activeConversation.userRole} - {activeConversation.status}</p>
                </div>
                {isAdmin && activeConversation.status !== "Closed" && (
                  <button className="outline-button" onClick={closeConversation} type="button">Close</button>
                )}
              </div>
              <div className="message-list">
                {messages.map((message) => {
                  const mine = message.senderRole === currentUser?.role && message.senderId === String(currentUser?.id || "");
                  const adminMessage = message.senderRole === "admin";
                  return (
                    <article className={`chat-message ${mine || (isAdmin && adminMessage) ? "mine" : ""}`} key={message.id}>
                      <div>
                        <strong>{message.senderName}</strong>
                        <span>{message.senderRole}</span>
                      </div>
                      <p>{message.message}</p>
                    </article>
                  );
                })}
              </div>
              <form className="chat-reply-form" onSubmit={sendReply}>
                {isAdmin && (
                  <div className="quick-reply-list" aria-label="Quick replies">
                    {quickReplies.map((quickReply) => (
                      <button
                        disabled={activeConversation.status === "Closed"}
                        key={quickReply.label}
                        onClick={() => setReply(quickReply.text)}
                        type="button"
                      >
                        {quickReply.label}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Type your message"
                  required
                  value={reply}
                />
                <button className="primary-button" disabled={isSending || activeConversation.status === "Closed"} type="submit">
                  <FaPaperPlane /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-panel">
              <FaComments />
              <h2>Select or start a support conversation</h2>
              <p>For urgent help, call 077 123 4567.</p>
            </div>
          )}
        </section>

        {!isAdmin && (
          <form className="form-panel chat-start-form" onSubmit={startConversation}>
            <h2><FaPlus /> New conversation</h2>
            {!currentUser && (
              <label>
                Your Name
                <input
                  onChange={(event) => updateStartForm("name", event.target.value)}
                  placeholder="Enter your name"
                  required
                  value={startForm.name}
                />
              </label>
            )}
            <label>
              Support Topic
              <select
                onChange={(event) => updateStartForm("subject", event.target.value)}
                required
                value={startForm.subject}
              >
                {supportTopics.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label>
              Your Question
              <textarea
                onChange={(event) => updateStartForm("message", event.target.value)}
                placeholder="Type your question for support"
                required
                value={startForm.message}
              />
            </label>
            {notice && <p className="form-message">{notice}</p>}
            <button className="primary-button full-width" disabled={isSending} type="submit">
              <FaPaperPlane /> Start Chat
            </button>
          </form>
        )}
      </div>
      {isAdmin && notice && <p className="form-message chat-notice">{notice}</p>}
    </section>
  );
}

export default ChatSupportScreen;
