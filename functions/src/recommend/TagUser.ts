enum Questions {
    AREA = "mentorship_area",
    INDUSTRY = "mentorship_industry",
    TYPE = "mentorship_type",
    FREQUENCY = "meeting_frequency",
    IMPACT = "impact",
    DISTANCE = "distance",
    EXPERIENCE = "mentorship_experience",
    COMMUNICATION = "communication",
}

export default Questions

export class TagUser {

    private _userId: string;
    private _area: string;
    private _industry: string;
    private _type: string;
    private _frequency: string;
    private _impact: string;
    private _communication: string;
    private compatabilityPercentage: number;
    private displayName: string;
    private photoUrl: string;
    private occupation: string;
    private location: string;

    constructor(userId: string, questions: any) {
        this._userId = userId;
        this.extractQuestions(questions);
    }

    public get userId(): any {
        return this._userId;
    }

    public get area(): string {
        return this._area;
    }

    public get industry(): string {
        return this._industry;
    }

    public get type(): string {
        return this._type;
    }

    public get frequency(): string {
        return this._frequency;
    }

    public get impact(): string {
        return this._impact;
    }

    public get communication(): string {
        return this._communication;
    }

    public setPercentage(percentage: number) {
        this.compatabilityPercentage = percentage;
    }

    public getPercentage() {
        return this.compatabilityPercentage;
    }

    public setDisplayName(name: string) {
        this.displayName = name;
    }

    public setPhotoUrl(photoURL: string) {
        this.photoUrl = photoURL;
    }

    public setOccupation(occupation: string) {
        this.occupation = occupation;
    }

    public setLocation(location: string) {
        this.location = location;
    }

    private extractQuestions(questions: any) {
        this._area = questions[Questions.AREA];
        this._industry = questions[Questions.INDUSTRY];
        this._type = questions[Questions.TYPE];
        this._frequency = questions[Questions.FREQUENCY];
        this._impact = questions[Questions.IMPACT];
        this._communication = questions[Questions.COMMUNICATION];
    }
}

