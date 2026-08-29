const firebaseConfig = {
  apiKey: "AIzaSyAzCMQ2-TuKteW74frQ-g1dWJD7yWWj6ik",
  authDomain: "pharmacy-tariq.firebaseapp.com",
  projectId: "pharmacy-tariq",
  storageBucket: "pharmacy-tariq.firebasestorage.app",
  messagingSenderId: "775240789969",
  appId: "1:775240789969:web:217492a5c4daab50a43af0",
};

firebase.initializeApp(firebaseConfig);
window.pharmacyDb = firebase.firestore();
