import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_GOES_HERE", // This is unique to your web app
  authDomain: "wedding-rsvp-a1b6a.firebaseapp.com",
  projectId: "wedding-rsvp-a1b6a",
  storageBucket: "wedding-rsvp-a1b6a.appspot.com",
  messagingSenderId: "857917263772", // This is your Project Number
  appId: "YOUR_APP_ID_GOES_HERE", // This is unique to your web app
  // measurementId: "YOUR_MEASUREMENT_ID_IF_USING_ANALYTICS" // Optional, if you've set up Google Analytics for this web app
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
