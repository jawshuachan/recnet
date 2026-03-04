import express from 'express';
import cors from 'cors';
import neo4j from 'neo4j-driver';
import * as fs from 'fs';

// const ensureEnv = (name: string, value: string | undefined): string => {
//     if (!value) throw new Error(`${name} must be set`);
//     return value;
// };

// const NEO4J_URI = ensureEnv('NEO4J_URI', process.env.NEO4J_URI);
// const NEO4J_USER = ensureEnv('NEO4J_USER', process.env.NEO4J_USER);
// const NEO4J_PASS = ensureEnv('NEO4J_PASS', process.env.NEO4J_PASS);

const NEO4J_URI  = 'neo4j://127.0.0.1:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASS = 'recnetpass';

const app = express();
const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASS)
);

app.use(cors())
app.use(express.json()) 

app.get('/', (req, res) => {
  res.send('RecNet API is running 🚀');
});

// Person 1 creates the session
// Person 2 joins the session

// Create a new session endpoint
app.post(`/api/sessions`, async (req, res) => {
    const neo4jSession = driver.session();
    const host = req.body.host;
    if(!host) {
        return res.status(400).json({error: 'Host info missing!'});
    }

    try {
        const cypher = `
            WITH $host as h
            CREATE (s:Session {
                sessionId:randomUUID(), 
                createdAt:datetime(), 
                status: "active"
            })

            // PERSON 1
            MERGE (cH:Country {code: h.country})
                ON CREATE SET cH.name = h.country

            CREATE (pH:Person {
                personId: randomUUID(),
                name: h.name
            })
            MERGE (pH)-[:IN_COUNTRY]->(cH)
            FOREACH (g in h.genres | 
                MERGE (gNode:Genre {name:g})
                MERGE (pH)-[:LIKES]->(gNode)
            )
            MERGE (pH)-[:IN_SESSION {role:"H"}]->(s)

            RETURN s.sessionId AS sessionId
        `
        const result = await neo4jSession.run(cypher, { host });
        const record = result.records[0]
        const sessionID = record.get('sessionId')

        res.status(201).json({message: `Session created: ${sessionID}`});
        console.log(`Created session: ${sessionID}`)
    } catch (err) {
        console.error('Failed to run session query', err);
        res.status(500).json({error: 'Failed to create session'});
    } finally {
        await neo4jSession.close();
    }
})

// Join session
app.post('/api/session/:id/join', async (req, res) => {
    const neo4jSession = driver.session();
    const participant = req.body.participant;
    const sessionId = req.params.id;

    if (!participant) {
        return res.status(400).json({ error: 'Participant info missing!' });
    }

    try {
        const cypher = `
        MATCH (s:Session {sessionId: $sessionId})
        WITH s, $participant AS p

        // Participant country
        MERGE (cP:Country {code: p.country})
            ON CREATE SET cP.name = p.country

        // Participant node
        CREATE (pP:Person {
            personId: randomUUID(),
            name: p.name
        })
        MERGE (pP)-[:IN_COUNTRY]->(cP)

        // Liked genres
        FOREACH (g IN p.genres |
            MERGE (gNode:Genre {name: g})
            MERGE (pP)-[:LIKES]->(gNode)
        )

        // Link participant to session
        MERGE (pP)-[:IN_SESSION {role: "P"}]->(s)

        // Return the sessionId from the node
        RETURN s.sessionId AS sessionId
        `;

        const result = await neo4jSession.run(cypher, {
        sessionId,
        participant,
        });

        if (!result.records.length) {
        return res.status(404).json({ error: 'Session not found' });
        }

        const record = result.records[0];
        const returnedId = record.get('sessionId');

        res.status(200).json({
        message: `Participant successfully joined session: ${returnedId}`,
        sessionId: returnedId,
        });

        console.log(`Session joined: ${returnedId}`);
    } catch (err) {
        console.error('Failed to run session query.', err);
        res.status(500).json({ error: 'Failed to join session.' });
    } finally {
        await neo4jSession.close();
    }
});

app.get(`/api/update-genres`, async (req, res) => {
    const base_url = 'https://api.themoviedb.org/3/genre';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwY2UzNTc1Mjg0MzcyMzY5N2M3MDBlMThhODY4YjA1MyIsIm5iZiI6MTc0MTIzODc5Ny43MDMsInN1YiI6IjY3YzkzMjBkYmE5NzNkOWY3ZjBjYzg5YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.TA3zQ52pqPhIdPf5Taj3hZGdgnD-XUBMiZY4_jRNtCE'
        }
    };
    const mediaTypes = ['movie', 'tv'];
    const urls = mediaTypes.map((type) => `${base_url}/${type}/list`);

    try {
        // first retrieve genre list from TMDB
        const results = await Promise.all(
            urls.map(async(url) => {
                const r = await fetch(url, options);
                const json = await r.json();

                if(!r.ok || json?.success == false) {
                    console.error('TMDB error response:', { url, status: r.status, json })
                    throw new Error(json?.status_message ?? `TMDB failed: ${r.status}`);
                }
                return json
            })
        )

        // format the JSON to get rid of parent "genres"
        const combined = results.flatMap((r: any) => Array.isArray(r?.genres) ? r.genres : [])

        // now use a hashmap to find in O(1) time
        const map = combined.reduce((acc, currentItem) => {
            acc.set(currentItem.id, currentItem.name);
            return acc;
        }, new Map<string, string>())
        console.log(map)

        const map_object = Object.fromEntries(map); // transform key value pairs into object

        // write to JSON file for persistence
        const outputFilePath: string = 'genres.json';
        const genreJSONString: string = JSON.stringify(map_object, null)
        fs.writeFile(outputFilePath, genreJSONString, 'utf-8', (err) => {
            if (err) {
                console.error('Error writing genres to file', err)
            }
        })
        console.log(`Genre data written to ${outputFilePath} as JSON.`)
        return res.status(200).json({results: combined})
    } catch (err) {
        console.error('Failed to update genres', err)
        res.status(500).json({error: "Failed to update movie genres."})
    }
})

/** 
 * sends request to TMDB API for movie retrieval then format and send to Neo4j
 * @argument {Number} length
 * @returns {MediaType} movie | tv
 */
app.post(`/api/session/:id/discover`, async (req, res) => {
    const base_url = 'https://api.themoviedb.org/3/discover';
    const key = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwY2UzNTc1Mjg0MzcyMzY5N2M3MDBlMThhODY4YjA1MyIsIm5iZiI6MTc0MTIzODc5Ny43MDMsInN1YiI6IjY3YzkzMjBkYmE5NzNkOWY3ZjBjYzg5YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.TA3zQ52pqPhIdPf5Taj3hZGdgnD-XUBMiZY4_jRNtCE";
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${key}`
        }
    };

    type MediaType = 'movie' | 'tv';
    interface DiscoverRequest {
        length?: number,
        mediaTypes?: MediaType[];
    }

    const { length=20, mediaTypes=['movie'] } = req.body as DiscoverRequest;
    const urls = mediaTypes.map((type) => `${base_url}/${type}`)

    try {
        const results = await Promise.all(
            urls.map(async (url) => {
                const r = await fetch(url, options);
                const json = await r.json();

                if (!r.ok || json?.success === false) {
                    console.error('TMDB error response:', { url, status: r.status, json });
                    throw new Error(json?.status_message ?? `TMDB failed: ${r.status}`);
                }
                
                return json;
            })
        );

        const combined = results.flatMap((r: any) => (Array.isArray(r?.results) ? r.results : []));
        const limited = combined.slice(0, length);

        return res.status(200).json({ results: limited });

  } catch (err) {
        console.error('Failed to discover from TMDB.', err)
        res.status(500).json({error: "Failed to retrieve movies."})
    } finally {
        
    }
})

/**
 * Swipe on a movie title (left = dislike, right = like)
 * @param {String} sessionId, participant
 * @returns {String}
 */
app.post(`/api/session/:id/swipe`, async (req, res) => {
    const neo4jSession = driver.session();
    const sessionId = req.params.id;
    const { personId, titleId, direction } = req.body as {
        personId ?: string;
        titleId?: string;
        direction?: 'left'|'right';
    };

    if (!personId || !titleId || (direction !== 'left' && direction !== 'right') ) {
        return res.status(400).json({error:`personId, titleId, direction are required.`});
    }

    try {
        const cypher = `
            MATCH (s:Session {sessionId: $sessionId})
            MATCH (p:Person {personId: $personId})
            MATCH (t:Title {titleId: $titleId})

            MERGE (p)-[r:SWIPED {sessionId: $sessionId}]->(t)
            SET r.direction = $direction,
                r.swipedAt = datetime()

            // check if the other person in the session also liked it

            WITH s, p, t, r
            MATCH (other:Person)-[:IN_SESSION]->(s)
            WHERE other <> p 
            OPTIONAL MATCH (other)-[r2:SWIPED {sessionId:$sessionId, direction:"right"}]->(t)

            RETURN
                r.direction AS direction,
                (r.direction = "right" AND r2 IS NOT NULL) AS isMatch
        `;

        const result = await neo4jSession.run(cypher, {sessionId, personId, titleId, direction });

        if (!result.records.length) {
            return res.status(404).json({error: `Session/person/title not found (or person not in session)`})
        }
        const record = result.records[0]
        const isMatch = record.get('isMatch');
        
        res.status(200).json({
            message: `Swipe recorded.`,
            sessionId,
            personId,
            titleId,
            direction: record.get('direction'),
            isMatch
        })
        console.log(`Swiped: session=${sessionId} title=${titleId}, direction=${direction}`)

    } catch(err) {
        console.error('Failed to run swipe query.', err)
        res.status(500).json({error: "Failed to swipe on movie."})
    } finally {
        await neo4jSession.close();
    }
});

// Make recommendations based on movies, genres, directors liked and disliked
app.post(`/api/session/:id/matches`, async (req, res) =>{

})

app.listen(3001, () => {
  console.log('API running on http://localhost:3001');
});
