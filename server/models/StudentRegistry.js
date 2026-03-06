import JsonModel from './JsonModel.js';

/**
 * StudentRegistry — pre-seeded records representing enrolled MCA students.
 * Students verify against this table (rollNo + phone) before self-registering.
 * Fields:
 *   rollNo          — e.g. "26MCA0001"
 *   name            — Student full name
 *   phone           — Registered mobile number
 *   assignedGuideId — ID of the staff guide (set after guides are seeded)
 *   assignedGuideName
 *   registered      — boolean, true once the student has created an account
 */
class StudentRegistry extends JsonModel {
    static collectionName = 'studentRegistry';
}

export default StudentRegistry;
