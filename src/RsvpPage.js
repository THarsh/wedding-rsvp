import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function RsvpPage() {
  const { uniqueId } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const tokenFromUrl = query.get("token");

  const [guest, setGuest] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "rsvp" | "count"
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchGuest = async () => {
      try {
        const docRef = doc(db, "invitees", uniqueId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const guestData = docSnap.data();
          if (guestData.token === tokenFromUrl) {
            setGuest({ id: docSnap.id, ...guestData });
          } else {
            setError("Invalid token. Access denied.");
          }
        } else {
          setError("Guest not found.");
        }
      } catch (err) {
        setError("Error fetching guest.");
      }
    };

    fetchGuest();
  }, [uniqueId, tokenFromUrl]);

  const handleYes = () => {
    setMode("count");
  };

  const handleNo = async () => {
    if (!guest) return;
    const docRef = doc(db, "invitees", guest.id);
    await updateDoc(docRef, {
      attending: "no",
      attendance_updated_count: 0,
    });
    setGuest({ ...guest, attending: "no", attendance_updated_count: 0 });
    setMode("view");
  };

  const handleSubmitCount = async () => {
    if (!guest) return;
    const number = parseInt(count, 10);

    if (isNaN(number) || number <= 0) {
      alert("Please enter a valid number.");
      return;
    }

    if (number > guest.attendance_max_count) {
      alert(
        `You cannot exceed your reserved seats (${guest.attendance_max_count}).`
      );
      return;
    }

    const docRef = doc(db, "invitees", guest.id);
    await updateDoc(docRef, {
      attending: "yes",
      attendance_updated_count: number,
    });
    setGuest({ ...guest, attending: "yes", attendance_updated_count: number });
    setMode("view");
  };

  if (error) return <p>{error}</p>;
  if (!guest) return <p>Loading...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Hello {guest.fullName}</h1>
      <p>
        You have <strong>{guest.attendance_max_count}</strong> seats reserved.
      </p>

      {/* --- VIEW MODE --- */}
      {mode === "view" && (
        <>
          {guest.attending === "yes" ? (
            <p>
              ✅ You have confirmed your attendance. Attendance count is{" "}
              <strong>{guest.attendance_updated_count}</strong>.
            </p>
          ) : guest.attending === "no" ? (
            <p>❌ You have confirmed you will not attend.</p>
          ) : (
            <p>Will you attend our wedding?</p>
          )}

          <div style={{ marginTop: "15px" }}>
            {guest.attending ? (
              <button
                style={{
                  padding: "10px 20px",
                  fontSize: "16px",
                  margin: "10px",
                }}
                onClick={() => setMode("rsvp")}
              >
                🔄 Change RSVP
              </button>
            ) : (
              <>
                <button
                  style={{
                    margin: "10px",
                    padding: "10px 20px",
                    fontSize: "18px",
                  }}
                  onClick={handleYes}
                >
                  ✅ YES
                </button>
                <button
                  style={{
                    margin: "10px",
                    padding: "10px 20px",
                    fontSize: "18px",
                  }}
                  onClick={handleNo}
                >
                  ❌ NO
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* --- RSVP MODE (Ask Yes/No again) --- */}
      {mode === "rsvp" && (
        <>
          <p>Would you like to update your RSVP?</p>
          <button
            style={{ margin: "10px", padding: "10px 20px", fontSize: "18px" }}
            onClick={handleYes}
          >
            ✅ YES
          </button>
          <button
            style={{ margin: "10px", padding: "10px 20px", fontSize: "18px" }}
            onClick={handleNo}
          >
            ❌ NO
          </button>
        </>
      )}

      {/* --- COUNT MODE (Input for YES response) --- */}
      {mode === "count" && (
        <div style={{ marginTop: "20px" }}>
          <p>How many people (max {guest.attendance_max_count}) will attend?</p>
          <input
            type="number"
            value={count}
            min="1"
            max={guest.attendance_max_count}
            onChange={(e) => setCount(e.target.value)}
            style={{ padding: "8px", fontSize: "16px", width: "80px" }}
          />
          <br />
          <button
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              fontSize: "18px",
            }}
            onClick={handleSubmitCount}
          >
            ✅ Confirm Attendance
          </button>
        </div>
      )}
    </div>
  );
}
