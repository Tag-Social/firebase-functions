import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import firebase from "firebase/compat";

const db = admin.firestore();
const mentorshipRef = db.collection('mentorshipRequests');
const usersRef = db.collection('users');

//TODO refactor common code
export const requestMentorship = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', '*');

    const menteeId = request.body["mentee-id"] || "dm7gdVcvEGaH3IW4conr6lM4fr33";
    const mentorId = request.body["mentor-id"] || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";
    const requestMsg = request.body["requestMsg"] || "I would like for you to be my mentor!";

    if (mentorId === undefined) {
        response.send({"error": "Mentor id not supplied unable to send request."});
    }
    const data = {
        mentorId: mentorId,
        menteeId : menteeId,
        message : requestMsg,
    };
    const promise = mentorshipRef.add(data);
    promise.then((result) => {
        response.send({"status": "Mentorship request sent."});
    }).catch((error) => {
        response.send({"error": error});
    });
});

export const acceptMentorship = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', '*');

    const menteeId = request.body["mentee-id"] || "r48pBCJL9aZuVF3kgKKdGHyt2Bp2";
    const mentorId = request.body["mentor-id"] || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    //Remove from mentorship table
    const deleted = deleteRequest(mentorId, menteeId, response);

    //Add mentee to Mentor's list of mentees
    if (deleted) {
        const addPromise = usersRef.doc(mentorId).update({
            'connections.mentees' : admin.firestore.FieldValue.arrayUnion(menteeId),
        }).then((result) => {
            response.send({"status": result.writeTime});
        }).catch((error) => {
            response.send({"error": error});
        });
    }
});

export const declineMentorship = functions.https.onRequest(async (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'DELETE');
    response.set('Access-Control-Allow-Headers', '*');

    const menteeId = request.body["mentee-id"] || "r48pBCJL9aZuVF3kgKKdGHyt2Bp2";
    const mentorId = request.body["mentor-id"] || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    //Remove from mentorship table
    await deleteRequest(mentorId, menteeId, response);
    response.send({"status": "Mentorship declined."});
});

export const pendingMentorship = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', '*');

    const menteeId = request.query.menteeid || "r48pBCJL9aZuVF3kgKKdGHyt2Bp2";
    const mentorId = request.query.mentorid || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    const promise = mentorshipRef.where("mentorId", "==", mentorId)
        .where("menteeId", "==", menteeId)
        .get()
        .then((result) => {
            response.send(!result.empty);
        }).catch(() => response.send(false)
        )
});

export const requestCount = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', '*');

    const mentorId = request.query.mentorid || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    const promise = mentorshipRef.where("mentorId", "==", mentorId)
        .get()
        .then((result) => {
            response.send({requestCount: result.size});
        }).catch(() => response.send({requestCount: 0})
        )
});

export const mentorshipRequests = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', '*');

    const mentorId = request.query.mentorId || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    const users: FirebaseFirestore.DocumentData[] = [];
    mentorshipRef.where("mentorId", "==", mentorId)
        .get()
        .then(async (result) => {
            for (const doc of result.docs) {
                const menteeId = doc.get("menteeId");
                 await usersRef.doc(menteeId).get().then((user) => {
                    const data = user.data();
                    if (data !== undefined) {
                        users.push({
                            id: menteeId,
                            photoURL: data.photoURL,
                            displayName: data.displayName,
                            occupation: data.occupation,
                            message: doc.get("message"),
                        });
                    }
                });
            }
            response.send(users);
        })
        .catch(() => response.send("Error getting mentorship requests for user.")
        )
});

    function deleteRequest(mentorId: string, menteeId: string, response: functions.Response<any>) {
        return mentorshipRef.where("mentorId", "==", mentorId)
            .where("menteeId", "==", menteeId)
            .get()
            .then((result) => {
                result.forEach((doc) => {
                    const promise = doc.ref.delete();
                });
            }).catch((error) => {
                response.send({"error": error});
            });
}


export const sendNotifications = functions.https.onRequest((request, response) => {
    const promise = sendNotification().then(r => response.send("success"));

});

function sendNotification() {
    const topic = 'highScores';

    const message = {
        notification: {
            title: '$FooCorp up 1.43% on the day',
            body: '$FooCorp gained 11.80 points to close at 835.67, up 1.43% on the day.',
        },
        token: "fr7SrIwFLctC1grgOUw-h1:APA91bG3X6j53su54TZ4au3NTtUahVQDb_Zw9nktfIaM0W4x3oKyLTKQhPu43ArA9SEA8JlXx1J8FXS-Qj-sEKAsWQy1xDXMi1oM5IEjzqb-cR_5UqczWEjIdFS8yo0kzyzrGGkwTvCn",
    };

// Send a message to devices subscribed to the provided topic.
        return admin.messaging().send(message)
        .then((response: any) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error: any) => {
            console.log('Error sending message:', error);
        });
}
