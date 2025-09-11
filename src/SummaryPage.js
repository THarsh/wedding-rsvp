import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function SummaryPage() {
  const [invitees, setInvitees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [token, setToken] = useState("");
  const defaultMaxCount = 1; // default attendance max count

  const baseUrl = process.env.REACT_APP_BASE_URL || window.location.origin;

  // Fetch invitees from Firebase
  useEffect(() => {
    const fetchInvitees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "invitees"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInvitees(data);
      } catch (error) {
        console.error("Error fetching invitees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitees();
  }, []);

  const handleDownloadExcel = () => {
    if (invitees.length === 0) {
      alert("No invitees to download.");
      return;
    }

    // Map data for Excel
    const dataForExcel = invitees.map((guest) => ({
      "Full Name": guest.fullName,
      "Unique ID": guest.id,
      Token: guest.token,
      Attendance: guest.attending ? "Responded" : "Pending",
      Attending: guest.attending || "-",
      "Max Count": guest.attendance_max_count,
      "Updated Count": guest.attendance_updated_count ?? 0,
      URL: `${baseUrl}/rsvp/${guest.id}?token=${guest.token}`,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(dataForExcel);

    // Create workbook and append worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invitees");

    // Write workbook and save
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "invitees.xlsx"
    );
  };

  // Generate random 4-character alphanumeric token
  const generateToken = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let newToken = "";
    for (let i = 0; i < 4; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(newToken);
  };

  // Add new invitee
  const handleAddInvitee = async () => {
    if (!fullName || !uniqueId || !token) {
      alert("Please fill all fields and generate token.");
      return;
    }

    // Check if uniqueId already exists
    if (invitees.find((guest) => guest.id === uniqueId)) {
      alert("Unique ID already exists!");
      return;
    }

    const newInvitee = {
      fullName,
      token,
      attendance_max_count: defaultMaxCount,
      attendance_updated_count: 0,
      attending: null,
    };

    try {
      const docRef = doc(db, "invitees", uniqueId);
      await setDoc(docRef, { id: uniqueId, ...newInvitee });

      setInvitees((prev) => [...prev, { id: uniqueId, ...newInvitee }]);

      // Reset form
      setFullName("");
      setUniqueId("");
      setToken("");
    } catch (err) {
      console.error("Error adding invitee:", err);
      alert("Failed to add invitee");
    }
  };

  // Edit invitee
  const handleEditInvitee = async (guest) => {
    const newFullName = prompt("Edit Full Name:", guest.fullName);
    if (newFullName === null) return;

    const newMaxCountStr = prompt(
      "Edit Max Count:",
      guest.attendance_max_count
    );
    if (newMaxCountStr === null) return;
    const newMaxCount = parseInt(newMaxCountStr, 10);
    if (isNaN(newMaxCount) || newMaxCount <= 0) {
      alert("Max Count must be a positive number.");
      return;
    }

    try {
      const docRef = doc(db, "invitees", guest.id);
      await updateDoc(docRef, {
        fullName: newFullName,
        attendance_max_count: newMaxCount,
      });

      setInvitees((prev) =>
        prev.map((g) =>
          g.id === guest.id
            ? { ...g, fullName: newFullName, attendance_max_count: newMaxCount }
            : g
        )
      );
    } catch (err) {
      console.error("Error updating invitee:", err);
      alert("Failed to update invitee");
    }
  };

  // Delete invitee
  const handleDeleteInvitee = async (uniqueId) => {
    if (!window.confirm("Are you sure you want to delete this invitee?"))
      return;

    try {
      const docRef = doc(db, "invitees", uniqueId);
      await deleteDoc(docRef);

      setInvitees((prev) => prev.filter((guest) => guest.id !== uniqueId));
    } catch (err) {
      console.error("Error deleting invitee:", err);
      alert("Failed to delete invitee");
    }
  };

  if (loading) return <p>Loading summary...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Wedding RSVP Summary</h1>
      <button
        onClick={handleDownloadExcel}
        style={{ marginBottom: "20px", padding: "6px 12px", cursor: "pointer" }}
      >
        Download Excel
      </button>

      {/* Add Invitee Form */}
      <div style={{ marginBottom: "30px" }}>
        <h2>Add New Invitee</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Unique ID"
          value={uniqueId}
          onChange={(e) => setUniqueId(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Token"
          value={token}
          readOnly
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={generateToken}
          style={{ marginRight: "10px", padding: "4px 10px" }}
        >
          Generate Token
        </button>
        <button onClick={handleAddInvitee}>Add Invitee</button>
      </div>

      {/* Table */}
      <table
        border="1"
        cellPadding="8"
        cellSpacing="0"
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Unique ID</th>
            <th>Token</th>
            <th>Attendance</th>
            <th>Attending</th>
            <th>Max Count</th>
            <th>Updated Count</th>
            <th>URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitees.map((guest) => {
            const url = `${baseUrl}/rsvp/${guest.id}?token=${guest.token}`;
            return (
              <tr key={guest.id}>
                <td>{guest.fullName}</td>
                <td>{guest.id}</td>
                <td>{guest.token}</td>
                <td>{guest.attending ? "Responded" : "Pending"}</td>
                <td>{guest.attending || "-"}</td>
                <td>{guest.attendance_max_count}</td>
                <td>{guest.attendance_updated_count ?? 0}</td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(url)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => handleEditInvitee(guest)}
                      style={{ padding: "4px 8px", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInvitee(guest.id)}
                      style={{ padding: "4px 8px", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
