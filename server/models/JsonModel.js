import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/db.json');

class JsonModel {
    static collectionName = ''; // To be overridden

    constructor(data = {}) {
        Object.assign(this, data);
    }

    static async readDb() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return { users: [], projects: [] };
        }
    }

    static async writeDb(data) {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    }

    static async find(query = {}) {
        const db = await this.readDb();
        const items = db[this.collectionName] || [];

        // Filter
        const filtered = items.filter(item => {
            for (let key in query) {
                // Support $or for Auth
                if (key === '$or') {
                    const conditions = query[key];
                    return conditions.some(cond => {
                        const k = Object.keys(cond)[0];
                        return item[k] === cond[k];
                    });
                }

                // Support nested objects
                if (typeof query[key] === 'object' && query[key] !== null) {
                    if (query[key].$ne) {
                        if (item[key] === query[key].$ne) return false;
                        continue;
                    }
                }

                if (item[key] !== query[key]) return false;
            }
            return true;
        });

        return filtered.map(data => new this(data));
    }

    static async findOne(query) {
        const results = await this.find(query);
        return results[0] || null;
    }

    static async findById(id) {
        const db = await this.readDb();
        const items = db[this.collectionName] || [];
        const item = items.find(i => i._id === id);
        return item ? new this(item) : null;
    }

    static async create(data) {
        const instance = new this(data);
        await instance.save();
        return instance;
    }

    static async deleteMany(query = {}) {
        const db = await this.readDb();

        // Naive delete all for seeder
        if (Object.keys(query).length === 0) {
            db[this.collectionName] = [];
        }

        await this.writeDb(db);
        return true;
    }

    static async countDocuments(query = {}) {
        const db = await this.readDb();
        const items = db[this.collectionName] || [];

        if (query.ticketId && query.ticketId.$regex) {
            const regex = new RegExp(query.ticketId.$regex.replace('^', '^'));
            return items.filter(i => regex.test(i.ticketId)).length;
        }
        return items.length;
    }

    async save() {
        const db = await this.constructor.readDb();
        const collection = this.constructor.collectionName;

        if (!db[collection]) db[collection] = [];
        let items = db[collection];

        if (this._id) {
            // Update
            const index = items.findIndex(i => i._id === this._id);
            if (index !== -1) {
                const updatedItem = { ...items[index], ...this, updatedAt: new Date().toISOString() };
                Object.assign(this, updatedItem); // Update local instance
                items[index] = updatedItem;
            } else {
                this.updatedAt = new Date().toISOString();
                items.push(this);
            }
        } else {
            // Create
            this._id = crypto.randomUUID();
            this.createdAt = new Date().toISOString();
            this.updatedAt = new Date().toISOString();
            // Important: need to convert to plain object if 'this' has circular refs? 
            // But 'this' is just data + prototype. JSON.stringify handles it.
            items.push(this);
        }

        db[collection] = items;
        await this.constructor.writeDb(db);
        return this;
    }

    async deleteOne() {
        const db = await this.constructor.readDb();
        const collection = this.constructor.collectionName;
        let items = db[collection] || [];

        const index = items.findIndex(i => i._id === this._id);
        if (index !== -1) {
            items.splice(index, 1);
            db[collection] = items;
            await this.constructor.writeDb(db);
        }
        return true;
    }
}

export default JsonModel;
