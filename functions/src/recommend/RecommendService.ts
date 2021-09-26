import * as functions from "firebase-functions";
import {TagUser} from "./TagUser";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const mentorsRef = db.collection('mentors');



export const recommendMentors = functions.https.onRequest((request, response) => {
    let mentors:any[] = [];

    //get current user survey info to compare to potential mentors
    let userId = "amrDMYhXmEcC0eC1Jkm9ZUXc4HY2"; //request.get("user-id");
    let mentee: TagUser;
    mentorsRef.doc(userId).get().then((menteeData => {
        const menteequestions = JSON.parse(JSON.stringify(menteeData.data()))["Questions"];
        mentee = new TagUser(userId, menteequestions);
        console.log("userdata: ", menteequestions);
        if (mentee !== undefined) {
            getMentorsFromDB(mentee).then((result) => {
                let ret: FirebaseFirestore.DocumentData[] = [];
                console.log("Total Mentors Matched: ", result.length);
                result.forEach(data => {
                    let questions = JSON.parse(JSON.stringify(data.data()))["Questions"];
                    try {
                        let potentialMentor = new TagUser(userId, questions);
                        mentors.push(potentialMentor);
                        ret.push(questions);
                    }
                    catch (e) {
                        console.log("Something went wrong: ", e);
                    }

                })

                //TODO filter duplicates
                response.send(mentors);
            });
        }
    }));
});

export const recommendMentees = functions.https.onRequest((request, response) => {
    // TODO logic for recommending mentees
    response.send("Recommended Mentees: ");
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
