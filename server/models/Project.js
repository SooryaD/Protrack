import JsonModel from './JsonModel.js';

class Project extends JsonModel {
    static collectionName = 'projects';

    constructor(data) {
        super(data);
        if (!this.history) this.history = [];
        if (!this.status) this.status = 'TITLE_PENDING';
        // New fields for Anna University portal flow
        if (this.firstReview === undefined) this.firstReview = null;
        if (this.secondReview === undefined) this.secondReview = null;
        if (this.cscStatus === undefined) this.cscStatus = null;
        if (this.cscComment === undefined) this.cscComment = '';
        if (this.cscReviewedAt === undefined) this.cscReviewedAt = null;
    }
}

export default Project;
