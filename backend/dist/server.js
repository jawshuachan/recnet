"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// const ensureEnv = (name: string, value: string | undefined): string => {
//     if (!value) throw new Error(`${name} must be set`);
//     return value;
// };
// const NEO4J_URI = ensureEnv('NEO4J_URI', process.env.NEO4J_URI);
// const NEO4J_USER = ensureEnv('NEO4J_USER', process.env.NEO4J_USER);
// const NEO4J_PASS = ensureEnv('NEO4J_PASS', process.env.NEO4J_PASS);
const NEO4J_URI = 'neo4j://127.0.0.1:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASS = 'recnetpass';
const app = (0, express_1.default)();
const driver = neo4j_driver_1.default.driver(NEO4J_URI, neo4j_driver_1.default.auth.basic(NEO4J_USER, NEO4J_PASS));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('RecNet API is running 🚀');
});
// Person 1 creates the session
// Person 2 joins the session
// Create a new session endpoint
app.post(`/api/sessions`, async (req, res) => {
    const neo4jSession = driver.session();
    const host = req.body;
    if (!host) {
        return res.status(400).json({ error: 'Host info missing!' });
    }
    try {
        const cypher = `
            WITH $host as h
            CREATE(s:Session {
                sessionId:randomUUID(), 
                createdAt:datetime(), 
                status: "active"
            })

            // PERSON 1
            MERGE (cH:Country {code: h.country})
                ON CREATE SET cH.name = h.country

            CREATE (pH:Person {
                personID: randomUUID(),
                name: h.name
            })
            MERGE (pH)-[:IN_COUNTRY]->(cH)
            FOREACH (g in h.genres | 
                MERGE (gNode:Genre {name:g})
                MERGE (pH)-[:LIKES]->(gNode)
            )
            MERGE (pH)-[:IN_SESSION {role:"H"}]->(s)

            RETURN s.sessionId AS sessionId
        `;
        const result = await neo4jSession.run(cypher, host);
        const record = result.records[0];
        const sessionID = record.get('sessionId');
        res.status(201).json({ message: `Session created: ${sessionID}` });
        console.log(`Created session: ${sessionID}`);
    }
    catch (err) {
        console.error('Failed to run session query', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
    finally {
        await neo4jSession.close();
    }
});
// Join session
app.post(`/api/session/:id/join`, async (req, res) => {
    const neo4jSession = driver.session();
    const participant = req.body;
    if (!participant) {
        return res.status(400).json({ error: 'P2 info missing!' });
    }
    const sessionId = req.params.id;
    try {
        const cypher = `
            MATCH(s:Session {sessionId = ${sessionId}})
            WITH s, $participant AS p
            // PERSON 2
            MERGE (cP:Country {code: p.country})
                ON CREATE SET cP.name = p.country

            CREATE (pP:Person {
                personID: randomUUID(),
                name: p.name
            })
            MERGE (pP)-[:IN_COUNTRY]->(cP)
            FOREACH (g in p.genres | 
                MERGE (gNode:Genre {name:g})
                MERGE (pP)-[:LIKES]->(gNode)
            )
            MERGE (pP)-[:IN_SESSION {role:"P"}]->(s)

            RETURN sessionId as sessionId;
        `;
        const result = await neo4jSession.run(cypher, { sessionId, participant });
        const record = result.records[0];
        const returnedId = record.get('sessionId');
        res.status(200).json({ message: `P2 successfully joined session: ${returnedId}` });
        console.log(`Session joined: ${sessionId}`);
    }
    catch {
        console.error('Failed to run session query.');
        res.status(500).json({ error: "Failed to join session." });
    }
    finally {
        await neo4jSession.close();
    }
});
// Swipe to understand genres liked
app.post(`api/session/:id/swipe`, async (req, res) => {
});
// Make recommendations based on movies, genres, directors liked and disliked
app.post(`api/session/:id/matches`, async (req, res) => {
});
app.listen(3000, () => {
    console.log('API running on http://localhost:3000');
});
