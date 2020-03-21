import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

// http request request 1
export const randomNumber = functions.https.onRequest((request, response) => {
  const number = Math.round(Math.random() * 100);
  console.log(number);
  response.send(number.toString());
});

// http request request 2
export const toTheDojo = functions.https.onRequest((request, response) => {
  response.redirect("https://www.thenetninja.co.uk");
});

// http callable function
export const sayHello = functions.https.onCall((data, context) => {
  const { name } = data;
  return `hello ninjas ${name}`;
});

// auth trigger (new user signup)
export const newUserSignUp = functions.auth.user().onCreate((user, context) => {
  // for background triggers you must return a value/promise
  return admin
    .firestore()
    .collection("users")
    .doc(user.uid)
    .set({
      email: user.email,
      upvotedOn: []
    });
});

// auth trigger (new user signup)
export const userDeleted = functions.auth.user().onDelete(user => {
  // for background triggers you must return a value/promise
  const doc = admin
    .firestore()
    .collection("users")
    .doc(user.uid);
  return doc.delete();
});

// http callable function (adding a request)
export const addRequest = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "only authenticated user can add requests"
    );
  }
  if (data.text.length > 30) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "request must be no more than 30 characters lang"
    );
  }
  return admin
    .firestore()
    .collection("requests")
    .add({
      text: data.text,
      upvotes: 0
    });
});

// update callable function
export const upvote = functions.https.onCall((data, context) => {
  // check auth state
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "only authenticated users can add requests"
    );
  }
  // get refs for user doc & request doc
  const user = admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid);
  const request = admin
    .firestore()
    .collection("requests")
    .doc(data.id);

  return user.get().then(doc => {
    // chek user hasn't already upvoted request;
    if (doc.data()?.upvotedOn.includes(data.id)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "only authenticated users can add request"
      );
    }

    // update user array
    return user
      .update({
        upvotedOn: [...doc.data()!.upvotedOn, data.id]
      })
      .then(() => {
        // update votes on the  request
        return request.update({
          upvotes: admin.firestore.FieldValue.increment(1)
        });
      });
  });
});
