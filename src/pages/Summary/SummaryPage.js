import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Popconfirm,
  message,
  Modal,
} from "antd";
import {
  CopyOutlined,
  PlusOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title } = Typography;

export default function SummaryPage() {
  const [invitees, setInvitees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [token, setToken] = useState("");
  const [maxCount, seMaxCount] = useState();
  const [editingGuest, setEditingGuest] = useState(null);

  useEffect(() => {
    fetchInvitees();
  }, []);

  // Fetch invitees and sort attending first
  const fetchInvitees = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "invitees"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort attending first
      data.sort((a, b) => {
        if (a.attending && !b.attending) return -1;
        if (!a.attending && b.attending) return 1;
        return 0;
      });
      setInvitees(data);
    } catch (error) {
      message.error("Error fetching invitees");
    } finally {
      setLoading(false);
    }
  };

  // Generate random 4-char token
  const generateToken = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(token);
    return token;
  };

  // Add invitee and prepend to table
  const handleAddInvitee = async () => {
    if (!fullName || !uniqueId || !token) {
      message.warning("Please fill all fields");
      return;
    }

    if (invitees.find((guest) => guest.id === uniqueId)) {
      message.error("Unique ID already exists!");
      return;
    }

    setButtonLoading(true);
    try {
      const docRef = doc(db, "invitees", uniqueId);
      const newGuest = {
        id: uniqueId,
        fullName,
        token,
        attendance_max_count: maxCount,
        attendance_updated_count: 0,
        attending: null,
      };
      await setDoc(docRef, newGuest);

      message.success("Invitee added!");
      setFullName("");
      setUniqueId("");
      setToken("");

      // Prepend new guest so it appears at top
      setInvitees((prev) => [newGuest, ...prev]);
    } catch (err) {
      message.error("Failed to add invitee");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "invitees", id));
      message.success("Deleted successfully");
      setInvitees((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      message.error("Delete failed");
    }
  };

  const handleEditSave = async () => {
    try {
      const docRef = doc(db, "invitees", editingGuest.id);
      await updateDoc(docRef, {
        fullName: editingGuest.fullName,
        token: editingGuest.token,
        attendance_max_count: editingGuest.attendance_max_count,
      });
      message.success("Updated successfully");
      setEditingGuest(null);
      fetchInvitees();
    } catch (err) {
      message.error("Update failed");
    }
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(invitees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invitees");
    XLSX.writeFile(wb, "invitees.xlsx");
  };

  const baseUrl = process.env.REACT_APP_BASE_URL || window.location.origin;

  const columns = [
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Unique ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
      sorter: (a, b) => a.token.localeCompare(b.token),
    },
    {
      title: "Attendance",
      key: "attendance",
      render: (guest) => (guest.attending ? "Responded" : "Pending"),
      sorter: (a, b) => {
        if (a.attending && !b.attending) return -1;
        if (!a.attending && b.attending) return 1;
        return 0;
      },
    },
    {
      title: "Attending",
      dataIndex: "attending",
      key: "attending",
      render: (val) => val || "-",
    },
    {
      title: "Max Count",
      dataIndex: "attendance_max_count",
      key: "attendance_max_count",
      sorter: (a, b) => a.attendance_max_count - b.attendance_max_count,
    },
    {
      title: "Updated Count",
      dataIndex: "attendance_updated_count",
      key: "attendance_updated_count",
      sorter: (a, b) => a.attendance_updated_count - b.attendance_updated_count,
    },
    {
      title: "URL",
      key: "url",
      render: (guest) => {
        const url = `${baseUrl}/rsvp/${guest.id}?token=${guest.token}`;
        return (
          <Space>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(url);
                message.success("URL copied!");
              }}
            />
          </Space>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (guest) => (
        <Space>
          <Button type="link" onClick={() => setEditingGuest(guest)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this invitee?"
            onConfirm={() => handleDelete(guest.id)}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Title level={2}>Wedding RSVP Summary</Title>

      <Space
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Button onClick={downloadExcel} icon={<DownloadOutlined />}>
            Download Excel
          </Button>
        </Space>
        <Space>
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            placeholder="Unique ID"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max count"
            value={maxCount}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) {
                seMaxCount(value);
              }
            }}
          />
          <Input
            placeholder="Token"
            value={token}
            readOnly
            style={{ width: 120 }}
          />
          <Button onClick={generateToken}>Generate Token</Button>
          <Button
            type="primary"
            onClick={handleAddInvitee}
            icon={<PlusOutlined />}
            loading={buttonLoading}
          >
            Add Invitee
          </Button>
        </Space>
      </Space>

      <Table
        dataSource={invitees}
        columns={columns}
        rowKey="id"
        loading={loading}
        bordered
      />

      <Modal
        open={!!editingGuest}
        title="Edit Invitee"
        onCancel={() => setEditingGuest(null)}
        onOk={handleEditSave}
      >
        {editingGuest && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              value={editingGuest.fullName}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, fullName: e.target.value })
              }
            />
            <Input
              value={editingGuest.token}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, token: e.target.value })
              }
            />
            <Input
              type="number"
              value={editingGuest.attendance_max_count}
              onChange={(e) =>
                setEditingGuest({
                  ...editingGuest,
                  attendance_max_count: Number(e.target.value),
                })
              }
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
