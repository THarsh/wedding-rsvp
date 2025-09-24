import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Row, Col, Spin, Input, Button, Radio, message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import styles from "./style.module.scss";
import dayjs from "dayjs";

export default function RsvpPage() {
  const { uniqueId } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const tokenFromUrl = query.get("token");
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "rsvp"
  const [count, setCount] = useState();
  const [loading, setLoading] = useState(true);
  const [radioValue, setRadioValue] = useState();
  const [showCount, setShowCount] = useState(false);
  const [btnLoad, setBtnLoad] = useState(false);
  const cutoffDate = new Date("2025-10-15T23:59:59");
  const cutoffMillis = cutoffDate.getTime();
  const now = Date.now();
  const [expired] = useState(now > cutoffMillis);
  const isOneSeat = guest?.attendance_max_count <= 1;

  message.config({
    top: 30, // distance from top
    duration: 5, // seconds visible
  });

  useEffect(() => {
    const fetchGuest = async () => {
      try {
        const docRef = doc(db, "invitees", uniqueId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Guest not found.");
          return;
        }

        const guestData = docSnap.data();
        if (guestData.token !== tokenFromUrl) {
          setError("Invalid token. Access denied.");
          return;
        }

        setGuest({ id: docSnap.id, ...guestData });
        setRadioValue(guestData.attending || undefined);
        setCount(guestData.attendance_updated_count || 0);
        setShowCount(guestData.attending === "yes");
      } catch {
        setError("Error fetching guest.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuest();
  }, [uniqueId, tokenFromUrl]);

  const handleSubmit = async () => {
    if (!guest) return;
    setBtnLoad(true);
    const docRef = doc(db, "invitees", guest.id);

    if (radioValue === "yes") {
      const number = parseInt(count, 10);

      if (!isOneSeat && (!number || number <= 0)) {
        setBtnLoad(false);
        message.warning({
          title: "Invalid Number",
          content: `You have ${guest.attendance_max_count} seats available. Please enter a number between 1 and ${guest.attendance_max_count}.`,
          centered: true,
        });
        return;
      }

      if (number > guest.attendance_max_count) {
        setBtnLoad(false);
        message.error({
          title: "Exceeds Limit",
          content: `You cannot exceed your reserved seats (${guest.attendance_max_count}).`,
        });
        return;
      }

      await updateDoc(docRef, {
        attending: "yes",
        attendance_updated_count: isOneSeat ? 1 : number,
      });

      setGuest({
        ...guest,
        attending: "yes",
        attendance_updated_count: isOneSeat ? 1 : number,
      });
      setBtnLoad(false);
      message.success({
        title: "RSVP Confirmed",
        content: isOneSeat
          ? `Your attendance has been confirmed.`
          : `Your attendance has been confirmed for ${number} people.`,
        centered: true,
      });
    } else if (radioValue === "no") {
      await updateDoc(docRef, { attending: "no", attendance_updated_count: 0 });
      setGuest({ ...guest, attending: "no", attendance_updated_count: 0 });

      message.info({
        title: "RSVP Updated",
        content: "You have confirmed that you will not attend.",
        centered: true,
      });
    } else {
      message.info({
        title: "Attendance Required",
        content: "Please select Yes or No before confirming your RSVP.",
        centered: true,
      });
    }
    setBtnLoad(false);
    setMode("view");
  };

  const handleRadioChange = (e) => {
    const newValue = e.target.value;
    setRadioValue(newValue);
    setShowCount(newValue === "yes");
  };

  const renderConfirmedYes = () => (
    <>
      <p>
        We are pleased to confirm your participation, with{" "}
        <strong>{guest.attendance_updated_count}</strong> seats reserved in your
        name.
      </p>
      {!expired && (
        <p style={{ marginBottom: 12 }}>
          Change of plans?
          <br /> Don't worry! Update your RSVP before{" "}
          <strong>{dayjs(cutoffMillis).format("MMMM DD")}</strong>.
        </p>
      )}
      <Button
        type="primary"
        onClick={() => setMode("rsvp")}
        style={{ fontSize: 16 }}
        disabled={expired}
      >
        Change RSVP
      </Button>
    </>
  );

  const renderConfirmedNo = () => (
    <>
      <p>
        You have confirmed you will <strong>not attend.</strong>
      </p>
      {!expired && (
        <p style={{ marginBottom: 12 }}>
          Change of plans?
          <br /> Don't worry! Update your RSVP before{" "}
          <strong>{dayjs(cutoffMillis).format("MMMM DD")}</strong>.
        </p>
      )}
      <Button
        type="primary"
        onClick={() => setMode("rsvp")}
        style={{ fontSize: 16 }}
        disabled={expired}
      >
        Change RSVP
      </Button>
    </>
  );

  const renderRsvpForm = () => (
    <>
      <div>
        <p>We are delighted to invite you to be a part of our special day!</p>
        <p style={{ marginBottom: 20 }}>
          {isOneSeat ? (
            ""
          ) : (
            <>
              You have <strong>{guest.attendance_max_count}</strong> seats
              reserved.
            </>
          )}
          Kindly confirm your participation at your earliest convenience so we
          can make the necessary arrangements.
        </p>

        <Radio.Group
          onChange={handleRadioChange}
          value={radioValue}
          style={{ marginBottom: 20 }}
        >
          <Radio value="yes" style={{ marginBottom: 15 }}>
            Yes, I’d be delighted to take part
          </Radio>
          <Radio value="no">Unfortunately, I won’t be able to attend</Radio>
        </Radio.Group>
      </div>
      {showCount && !isOneSeat && (
        <div>
          <p>
            Please confirm the number of attendees <br /> (up to{" "}
            {guest.attendance_max_count}).
          </p>
          <Input
            type="number"
            value={count}
            min={1}
            max={guest.attendance_max_count}
            onChange={(e) => {
              const value = Number(e.target.value);
              setCount(value);
            }}
            style={{
              padding: "8px",
              fontSize: "16px",
              width: "80px",
              marginBottom: 20,
            }}
          />
        </div>
      )}

      <Button
        type="primary"
        onClick={handleSubmit}
        style={{ fontSize: 16 }}
        loading={btnLoad}
      >
        Confirm
      </Button>
    </>
  );

  if (error) {
    return (
      <Row
        justify="center"
        align="middle"
        style={{ height: "100dvh", margin: 0 }}
      >
        <p style={{ color: "red" }}>{error}</p>
      </Row>
    );
  }

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: "100dvh", margin: 0 }}
    >
      <Col xs={20} sm={20} md={16} lg={10} xl={8}>
        <Spin
          indicator={<LoadingOutlined style={{ color: "#081a01" }} spin />}
          size="large"
          spinning={loading}
        >
          {guest && (
            <div className={styles.mainWrapper}>
              <div className={styles.card}>
                <h2>
                  Hi <strong>{guest.fullName},</strong>
                </h2>
                <div>
                  {guest.attending === "yes" &&
                    mode === "view" &&
                    renderConfirmedYes()}
                  {guest.attending === "no" &&
                    mode === "view" &&
                    renderConfirmedNo()}
                  {(!guest.attending || mode === "rsvp") && renderRsvpForm()}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Col>
    </Row>
  );
}
