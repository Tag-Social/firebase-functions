import * as functions from "firebase-functions";
import Questions, {TagUser} from "./TagUser";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const mentorsRef = db.collection('mentors');
const menteesRef = db.collection('mentees');
const usersRef = db.collection('users');

export const recommendMentors = functions.https.onRequest((request, response) => {

    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', '*');

    //get current user survey info to compare to potential mentors
    let userId = request.get("user-id");

    if (userId === undefined) {
        response.send({"Error":"UserId not supplied, unable to recommend mentors."});
    }

    let mentors: TagUser[] = [];
    const menteePromise = menteesRef.doc(<string>userId).get().then((menteeData => {
        if (menteeData.data() !== undefined) {
            const menteequestions = JSON.parse(JSON.stringify(menteeData.data()))["Questions"];
            return new TagUser(<string>userId, menteequestions);
        }
        return undefined;
    }))
        .then((mentee) => {
            if (mentee !== undefined) {
                getMentorsFromDB(mentee).then((result) => {
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
                                    const data = userSnapshot.data();
                                    if (data !== undefined) {
                                        if (data.displayName !== null)
                                            mentor.setDisplayName(data.displayName);

                                        if (data.photoURL !== null)
                                            mentor.setPhotoUrl(data.photoURL);

                                        if (data.occupation !== null)
                                            mentor.setOccupation(data.occupation);

                                        if (data.location !== null)
                                            mentor.setLocation(data.location);

                                    }
                                });

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

// export const recommendMentees = functions.https.onRequest((request, response) => {
//     // TODO logic for recommending mentees
//     response.send("Recommended Mentees: ");
// });

export const storeMentor = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', '*');

    const areaQuestion = Questions.AREA;
    const impactQuestion = Questions.IMPACT;
    const typeQuestion = Questions.TYPE;
    const communicationQuestion = Questions.COMMUNICATION;
    const industryQuestion = Questions.INDUSTRY;
    const frequencyQuestion = Questions.FREQUENCY;

    const userId = request.get("user-id");
    const area = request.get(areaQuestion);
    const impact = request.get(impactQuestion);
    const type = request.get(typeQuestion);
    const communication = request.get(communicationQuestion);
    const frequency = request.get(industryQuestion);
    const industry = request.get(frequencyQuestion);

    if (userId === undefined) {
        response.send({"error": "No userId supplied, unable to store mentor."});
    }
    const data = {
        areaQuestion: area,
        impactQuestion: impact,
        typeQuestion: type,
        communicationQuestion: communication,
        industryQuestion: industry,
        frequencyQuestion: frequency,
    }
    const promise = mentorsRef.doc(<string>userId).set(data);
    promise.then((result) => {
        response.send({"status": result});
    }).catch((error) => {
        response.send({"error": error});
    });
});

async function getMentorsFromDB(mentee: TagUser) {

    const area = mentorsRef.where('Questions.mentorship_area', '==', mentee.area).get();
    const impact = mentorsRef.where('Questions.impact', '==', mentee.impact).get();
    const type = mentorsRef.where('Questions.mentorship_type', '==', mentee.type).get();
    const communication = mentorsRef.where('Questions.communication', '==', mentee.communication).get();
    const frequency = mentorsRef.where('Questions.meeting_frequency', '==', mentee.frequency).get();
    const industry = mentorsRef.where('Questions.mentorship_industry', '==', mentee.industry).get();


    const [areaSnapshot, impactSnapshot, typeSnapshot, communicationSnapshot, frequencySnapshot, industrySnapshot] = await Promise.all([
        area,
        impact,
        type,
        communication,
        frequency,
        industry,
    ]);

    const mentorsFromDB: any[] = [];
    const areaArray = areaSnapshot.docs;
    const impactArray = impactSnapshot.docs;
    const typeArray = typeSnapshot.docs;
    const communicationArray = communicationSnapshot.docs;
    const frequencyArray = frequencySnapshot.docs;
    const industryArray = industrySnapshot.docs;

    return mentorsFromDB.concat(areaArray)
        .concat(impactArray)
        .concat(typeArray)
        .concat(communicationArray)
        .concat(frequencyArray)
        .concat(industryArray);
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
