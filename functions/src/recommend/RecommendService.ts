import * as functions from "firebase-functions";
import Questions, {TagUser} from "./TagUser";
import * as admin from "firebase-admin";
import CollectionReference = admin.firestore.CollectionReference;
import DocumentSnapshot = admin.firestore.DocumentSnapshot;

const db = admin.firestore();
const mentorsRef = db.collection('mentors');
const menteesRef = db.collection('mentees');
const usersRef = db.collection('users');

//TODO refactor common code between mentors and mentees

export const recommendMentors = functions.https.onRequest((request, response) => {

    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', '*');

    //get current user survey info to compare to potential mentors
    const userId = request.query.userid?.toString() || "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2";

    if (userId === undefined) {
        response.send({"Error":"UserId not supplied, unable to recommend mentors."});
    }

    let mentors: TagUser[] = [];
    const menteePromise = menteesRef.doc(userId).get().then((async menteeData => {
        if (menteeData.data() !== undefined) {
            const menteequestions = JSON.parse(JSON.stringify(menteeData.data()))["Questions"];
            const mentee: TagUser = new TagUser(userId, menteequestions);
            const user = await usersRef.doc(userId)
                .get()
                .then((userSnapshot) => {
                    setUserData(userSnapshot, mentee);
                });
            return mentee;
        }
        return undefined;
    }))
        .then((mentee) => {
            if (mentee !== undefined) {
                getMatchesFromDB(mentee, mentorsRef).then((result) => {
                    result.forEach(data => {
                        const mentorId = data.ref.id;
                        let questions = JSON.parse(JSON.stringify(data.data()))["Questions"];
                        try {
                            const potentialMentor = new TagUser(mentorId, questions);
                            mentors.push(potentialMentor);
                        } catch (e) {
                            console.log("Something went wrong: ", e);
                        }
                    })
                    mentors = mentors.filter((item, pos, self) => self.findIndex(v => v.userId === item.userId) === pos);
                })
                    .then(async () => {
                        for (const mentor of mentors) {
                            const user = await usersRef.doc(mentor.userId)
                                .get()
                                .then((userSnapshot) => {
                                    setUserData(userSnapshot, mentor);
                                });
                                const commonInterests: string[] = getCommonInterests(mentee.getInterests(), mentor.getInterests());
                                mentor.setCommonInterests(commonInterests);
                                const percentage: number = computeMatch(mentee, mentor);
                                mentor.setPercentage(percentage);
                        }
                    })
                    .then(() => {
                        mentors = Array.from(mentors)
                            .sort((a: TagUser, b: TagUser) => (a.getPercentage() > b.getPercentage() ? -1 : 1));
                    })
                    .finally(() => {
                        response.send(mentors);
                    });
            }
            else {
                response.send({"Error":"Cannot find user, unable to recommend mentors."});
            }
        })
});

export const recommendMentees = functions.https.onRequest((request, response) => {

    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', '*');

    //get current user survey info to compare to potential mentors
    const userId = request.query.userid?.toString();

    if (userId === undefined) {
        response.send({"Error":"UserId not supplied, unable to recommend mentees."});
    }

    let mentees: TagUser[] = [];
    const mentorPromise = mentorsRef.doc(<string>userId).get().then((mentorData => {
        if (mentorData.data() !== undefined) {
            const mentorquestions = JSON.parse(JSON.stringify(mentorData.data()))["Questions"];
            return new TagUser(<string>userId, mentorquestions);
        }
        return undefined;
    }))
        .then((mentor) => {
            if (mentor !== undefined) {
                getMatchesFromDB(mentor, menteesRef).then((result) => {
                    result.forEach(data => {
                        const menteeId = data.ref.id;
                        let questions = JSON.parse(JSON.stringify(data.data()))["Questions"];
                        try {
                            const potentialMentee = new TagUser(menteeId, questions);
                            mentees.push(potentialMentee);
                        } catch (e) {
                            console.log("Something went wrong: ", e);
                        }
                    })
                    mentees = mentees.filter((item, pos, self) => self.findIndex(v => v.userId === item.userId) === pos);
                })
                    .then(async () => {
                        for (const mentee of mentees) {
                            const user = await usersRef.doc(mentee.userId)
                                .get()
                                .then((userSnapshot) => {
                                    setUserData(userSnapshot, mentee);
                                });
                            const percentage: number = computeMatch(mentor, mentee);
                            mentee.setPercentage(percentage);
                        }
                    })
                    .then(() => {
                        mentees = Array.from(mentees)
                            .sort((a: TagUser, b: TagUser) => (a.getPercentage() > b.getPercentage() ? -1 : 1));
                    })
                    .finally(() => {
                        response.send(mentees);
                    });
            }
            else {
                response.send({"Error":"Cannot find user, unable to recommend mentees."});
            }
        })
});

export const storeMentor = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', '*');

    const userId = request.body["user-id"];
    const area = request.body[Questions.AREA];
    const impact = request.body[Questions.IMPACT];
    const type = request.body[Questions.TYPE];
    const communication = request.body[Questions.COMMUNICATION];
    const frequency = request.body[Questions.INDUSTRY];
    const industry = request.body[Questions.FREQUENCY];

    if (userId === undefined) {
        response.send({"error": "No userId supplied, unable to store mentor."});
    }
    const data = {
        Questions : {
            mentorship_area: area,
            impact: impact,
            mentorship_type: type,
            communication: communication,
            mentorship_industry: industry,
            meeting_frequency: frequency,
        },
    }
    const promise = mentorsRef.doc(<string>userId).set(data);
    promise.then((result) => {
        response.send({"status": result});
    }).catch((error) => {
        response.send({"error": error});
    });
});

export const storeMentee = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', '*');

    const userId = request.body["user-id"];
    const area = request.body[Questions.AREA];
    const impact = request.body[Questions.IMPACT];
    const type = request.body[Questions.TYPE];
    const communication = request.body[Questions.COMMUNICATION];
    const frequency = request.body[Questions.INDUSTRY];
    const industry = request.body[Questions.FREQUENCY];

    if (userId === undefined) {
        response.send({"error": "No userId supplied, unable to store mentor."});
    }
    const data = {
        Questions : {
            mentorship_area: area,
            impact: impact,
            mentorship_type: type,
            communication: communication,
            mentorship_industry: industry,
            meeting_frequency: frequency,
        },
    }
    const promise = menteesRef.doc(<string>userId).set(data);
    promise.then((result) => {
        response.send({"status": result});
    }).catch((error) => {
        response.send({"error": error});
    });
});

async function getMatchesFromDB(user: TagUser, collectionRef: CollectionReference) {

    const area = collectionRef.where('Questions.mentorship_area', '==', user.area).get();
    const impact = collectionRef.where('Questions.impact', '==', user.impact).get();
    const type = collectionRef.where('Questions.mentorship_type', '==', user.type).get();
    const communication = collectionRef.where('Questions.communication', '==', user.communication).get();
    const frequency = collectionRef.where('Questions.meeting_frequency', '==', user.frequency).get();
    const industry = collectionRef.where('Questions.mentorship_industry', '==', user.industry).get();


    const [areaSnapshot, impactSnapshot, typeSnapshot, communicationSnapshot, frequencySnapshot, industrySnapshot] = await Promise.all([
        area,
        impact,
        type,
        communication,
        frequency,
        industry,
    ]);

    const matchesFromDB: any[] = [];
    const areaArray = areaSnapshot.docs;
    const impactArray = impactSnapshot.docs;
    const typeArray = typeSnapshot.docs;
    const communicationArray = communicationSnapshot.docs;
    const frequencyArray = frequencySnapshot.docs;
    const industryArray = industrySnapshot.docs;

    return matchesFromDB.concat(areaArray)
        .concat(impactArray)
        .concat(typeArray)
        .concat(communicationArray)
        .concat(frequencyArray)
        .concat(industryArray);
}

function setUserData(userSnapshot: DocumentSnapshot, user: TagUser) {
    const data = userSnapshot.data();
    //console.log("Data: ", data);
    if (data !== undefined) {
        if (data.displayName !== null)
            user.setDisplayName(data.displayName);

        if (data.photoURL !== null)
            user.setPhotoUrl(data.photoURL);

        if (data.occupation !== null)
            user.setOccupation(data.occupation);

        if (data.location !== null)
            user.setLocation(data.location);

        if (data.bio !== null)
            user.setBio(data.bio);

        if (data.interests !== null)
            user.setInterests(data.interests);
    }
}

function computeMatch(mentee: TagUser, mentor:TagUser) {
    let score = 0;
    if (mentee.area === mentor.area) {
        score++;
    }
    if (mentee.industry === mentor.industry) {
        score++;
    }
    if (mentee.impact === mentor.impact) {
        score++;
    }
    if (mentee.type === mentor.type) {
        score++;
    }
    if (mentee.communication === mentor.communication) {
        score++;
    }
    if (mentee.frequency === mentor.frequency) {
        score++;
    }
    return Math.round((100 * score) / 6);
}

function getCommonInterests(interests: string[], interests2: string[]) {
    const commonInterests: string[] = [];
    if (interests !== undefined && interests2 !== undefined) {
        interests.forEach(interest => {
            interests2.forEach(interest2 => {
                if (interest === interest2) {
                    commonInterests.push(interest2);
                }
            });
        });
    }
    return commonInterests;
}
