import JsonModel from './JsonModel.js';

/**
 * GuideRequest — a student's request to be assigned a guide.
 * Fields:
 *   studentId       — student user _id
 *   studentName     — student name
 *   rollNo          — student roll number
 *   staffId         — target staff _id
 *   staffName       — target staff name
 *   status          — 'pending' | 'accepted' | 'rejected'
 *   rejectionReason — filled on rejection
 */
class GuideRequest extends JsonModel {
    static collectionName = 'guideRequests';
}

export default GuideRequest;
