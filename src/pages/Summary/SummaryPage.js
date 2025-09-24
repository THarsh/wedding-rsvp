import React, { useEffect, useState } from "react";
import {
  collection,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Table,
  Button,
  Input,
  Row,
  Col,
  Typography,
  Popconfirm,
  message,
  Modal,
  Space,
} from "antd";
import {
  CopyOutlined,
  PlusOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title } = Typography;
const { Search } = Input;

export default function SummaryPage() {
  const [invitees, setInvitees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const baseUrl = process.env.REACT_APP_BASE_URL || window.location.origin;

  // Form state
  const [fullName, setFullName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [token, setToken] = useState("");
  const [maxCount, seMaxCount] = useState();
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Real-time Firestore subscription
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "invitees"),
      (querySnapshot) => {
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
        setLoading(false);
      },
      (error) => {
        message.error("Error fetching invitees in real-time");
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalInvited = invitees.reduce(
    (sum, guest) => sum + (guest.attendance_max_count || 0),
    0
  );

  const totalConfirmed = invitees.reduce(
    (sum, guest) => sum + (guest.attendance_updated_count || 0),
    0
  );

  const filteredInvitees = invitees.filter((guest) =>
    guest.fullName?.toLowerCase().includes(searchText.toLowerCase())
  );

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
      seMaxCount(undefined);
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

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Totals */}
        <Col xs={24} md={6}>
          <Space direction="vertical">
            <Typography.Text strong style={{ color: "#14a477" }}>
              Total Invited: {totalInvited}
            </Typography.Text>
            <Typography.Text strong style={{ color: "#0b7151" }}>
              Confirmed: {totalConfirmed}
            </Typography.Text>
          </Space>
        </Col>

        {/* Download + Search */}
        <Col xs={24} md={8}>
          <Space style={{ width: "100%" }}>
            <Button block onClick={downloadExcel} icon={<DownloadOutlined />}>
              Download Excel
            </Button>
            <Search
              placeholder="Search by full name"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1 }}
            />
          </Space>
        </Col>

        {/* Add Invitee Form */}
        <Col xs={24} md={10}>
          <Space direction="vertical" style={{ width: "100%" }}>
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
                  seMaxCount(Number(e.target.value));
                }
              }}
            />
            <Space>
              <Input
                placeholder="Token"
                value={token}
                readOnly
                style={{ width: 120 }}
              />
              <Button onClick={generateToken}>Generate</Button>
            </Space>
            <Button
              type="primary"
              block
              onClick={handleAddInvitee}
              icon={<PlusOutlined />}
              loading={buttonLoading}
            >
              Add Invitee
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={filteredInvitees}
        columns={columns}
        rowKey="id"
        loading={loading}
        bordered
        scroll={{ x: "max-content" }} // horizontal scroll on small screens
        pagination={{
          pageSize: 8,
          showSizeChanger: false, // remove page size dropdown
        }}
      />

      <Modal
        open={!!editingGuest}
        title="Edit Invitee"
        onCancel={() => setEditingGuest(null)}
        onOk={handleEditSave}
      >
        {editingGuest && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <label>Full Name</label>
            <Input
              value={editingGuest.fullName}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, fullName: e.target.value })
              }
            />
            <label>Token</label>
            <Input
              value={editingGuest.token}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, token: e.target.value })
              }
            />
            <label>Max Count</label>
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
