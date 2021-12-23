import * as admin from "firebase-admin";

admin.initializeApp();



//functions for recommending Mentors/Mentees
exports.mentoring = require('./recommend/RecommendService');

//functions for Managing Mentorship requests
exports.request = require('./mentorship/RequestService');

//TODO functions for other services
