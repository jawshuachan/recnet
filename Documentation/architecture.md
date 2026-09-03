# The Recnet Rewrite

## What is the goal?
This project serves as a learning playground and sandbox for creating models, writing integrations / custom APIs, migrations and everything ASP.NET CORE. I just want to get good at my job lol. As a junior engineer / developer, I don't want to be handing off my thinking to AI, a common symptom I find myself falling for more and more these days.

## What is RecNet?
Recnet is a recommendation engine that uses neo4j for providing Netflix suggestions since some media is region bound. Also, it's a bit tough to find something in common that is interesting to watch since we are bombarded with so many options through the occasional Netflix UI.

## Who are we serving?
Lowkey just claire and I, still want to build this with scale in consideration as good practice.

## Tech
Few things to note:
- using neo4j for graphs / relationship identification -- more connections = increased likelihood of finding interesting content / better recommendations
- users don't need to be authenticated to use the service
- users just need to create and join a party
- at least 2 users are required to start the party

## Pipeline
- Ingestion -> normalization -> projection into Neo4j query

## To Do
1. First lets create the party system. ie. how do users create and join? includes User, Party models, and what to save in the database if necessary (all the boilerplate code)
2. The recommendation engine (Neo4j)

To Note

