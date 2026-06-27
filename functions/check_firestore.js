const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "demldotcom" });
const db = admin.firestore();
db.collection("users")
  .doc("testuser")
  .collection("data")
  .doc("stats")
  .get()
  .then((doc) => {
    if (doc.exists) {
      console.log("Document data:", doc.data());
    } else {
      console.log("No such document!");
    }
  })
  .catch((err) => {
    console.log("Error getting document", err);
  });
