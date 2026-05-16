# hengames

A full-stack TypeScript card game application focused first on making Hand and Foot easy to play together without managing physical decks, shuffling, or table state.

The planned first implementation uses a Vite React client, a TypeScript Node server, tRPC for typed commands and queries, and WebSocket broadcasts for live room updates. The server owns game state, rooms are anonymous and in-memory for the first version, and the game engine is designed around a standard interface so future card games or house-rule variants can be added without rewriting the room system.
